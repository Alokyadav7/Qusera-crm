// run-auth-migration.mjs
// Runs the auth column migrations and sets super admin
// Usage: node scripts/run-auth-migration.mjs

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPER_ADMIN_EMAIL = 'info@qusera.in'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

// Helper: run SQL via Supabase Management API
async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql: query }),
  })
  return { status: res.status, ok: res.ok, body: await res.text() }
}

// Helper: direct REST PATCH
async function patch(table, filter, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  })
  return { status: res.status, ok: res.ok, body: await res.json() }
}

// Helper: direct REST GET
async function get(table, filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'GET',
    headers,
  })
  return { status: res.status, ok: res.ok, body: await res.json() }
}

async function run() {
  console.log('🔧 Klinq CRM — Auth Migration Runner\n')

  // ── Step 1: Get the user ID ────────────────────────────────────────────────
  console.log('1️⃣  Fetching user ID for', SUPER_ADMIN_EMAIL, '...')
  const usersRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(SUPER_ADMIN_EMAIL)}`,
    { headers }
  )
  const usersData = await usersRes.json()
  const users = usersData.users ?? usersData
  const user = Array.isArray(users)
    ? users.find(u => u.email === SUPER_ADMIN_EMAIL)
    : users
  
  if (!user?.id) {
    console.error('❌ User not found. Run setup-super-admin.mjs first.')
    process.exit(1)
  }
  const userId = user.id
  console.log('   ✅ User ID:', userId)

  // ── Step 2: Add columns to profiles (via ALTER TABLE through SQL RPC) ───────
  console.log('\n2️⃣  Adding missing columns to profiles table...')
  const profileCols = [
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temp_password_used boolean DEFAULT false`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true`,
  ]
  for (const q of profileCols) {
    const r = await sql(q)
    if (r.ok || r.body.includes('already exists') || r.status === 200) {
      console.log('   ✅', q.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0])
    } else {
      // RPC might not exist — try direct approach
      console.log('   ⚠️  SQL RPC unavailable, using direct update instead')
      break
    }
  }

  // ── Step 3: Add columns to companies ──────────────────────────────────────
  console.log('\n3️⃣  Adding missing columns to companies table...')
  const companyCols = [
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_complete boolean DEFAULT false`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_step integer DEFAULT 0`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspension_reason text`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand_color varchar(7)`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz`,
  ]
  for (const q of companyCols) {
    const r = await sql(q)
    const col = q.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0] ?? q
    console.log(`   ${r.ok ? '✅' : '⚠️ '} ${col}`)
  }

  // ── Step 4: Set super admin on profiles via REST ──────────────────────────
  console.log('\n4️⃣  Setting is_super_admin=true on profile...')
  const patchRes = await patch(
    'profiles',
    `id=eq.${userId}`,
    { is_super_admin: true, onboarding_completed: true, is_active: true }
  )
  if (patchRes.ok || patchRes.status === 200 || patchRes.status === 204) {
    console.log('   ✅ Profile updated')
  } else {
    console.log('   ⚠️  Status', patchRes.status, '- column may not exist yet')
    console.log('   → Run supabase/fix-auth-columns.sql manually in Supabase SQL Editor')
  }

  // ── Step 5: Ensure platform_admins row ────────────────────────────────────
  console.log('\n5️⃣  Ensuring platform_admins row exists...')
  const paRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_admins`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, is_active: true }),
  })
  console.log('   ✅ platform_admins upsert:', paRes.status)

  // ── Step 6: Set app_metadata ──────────────────────────────────────────────
  console.log('\n6️⃣  Setting app_metadata.is_platform_admin=true on auth user...')
  const metaRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ app_metadata: { is_platform_admin: true } }),
  })
  const metaData = await metaRes.json()
  if (metaRes.ok) {
    console.log('   ✅ app_metadata set')
  } else {
    console.log('   ❌ Failed:', JSON.stringify(metaData))
  }

  // ── Step 7: Verify ────────────────────────────────────────────────────────
  console.log('\n7️⃣  Verifying profile...')
  const verify = await get('profiles', `id=eq.${userId}&select=id,is_super_admin,onboarding_completed,is_active`)
  const row = Array.isArray(verify.body) ? verify.body[0] : verify.body
  if (row) {
    console.log('   Profile row:', JSON.stringify(row, null, 2))
    if (row.is_super_admin) {
      console.log('\n🎉 SUCCESS! Super admin configured correctly.')
    } else {
      console.log('\n⚠️  is_super_admin is still false.')
      console.log('   The column may not exist yet.')
      console.log('   Please run supabase/fix-auth-columns.sql in Supabase SQL Editor:')
      console.log('   https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql/new')
    }
  } else {
    console.log('   ⚠️  Profile row not found (profile may not have been created yet)')
  }

  console.log('\n📋 Summary:')
  console.log('   Email:    ', SUPER_ADMIN_EMAIL)
  console.log('   User ID:  ', userId)
  console.log('   Login URL: http://localhost:3000/login')
  console.log('   Expected:  → redirects to /super-admin')
  console.log('\n⚠️  If columns failed, run this SQL manually:')
  console.log('   https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql/new')
  console.log('   File: supabase/fix-auth-columns.sql')
}

run().catch(console.error)
