// setup-super-admin.mjs
// Run: node scripts/setup-super-admin.mjs

const SUPABASE_URL   = 'https://eqllqrppeodrhalpiajx.supabase.co'
const SERVICE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxbGxxcnBwZW9kcmhhbHBpYWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2NzQ5MiwiZXhwIjoyMDkzNjQzNDkyfQ.tP-MhWOW0PuhFXXTA39YWiO5dHlmmUG1gtjF-pSpKyE'

const EMAIL    = 'info@qusera.in'
const PASSWORD = 'Qusera@2026'

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function run() {
  console.log('🔄 Step 1: Create / fetch user...')

  // Try creating the user (will fail if already exists)
  let userId = null
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { is_platform_admin: true },
    }),
  })
  const createData = await createRes.json()

  if (createRes.ok) {
    userId = createData.id
    console.log(`✅ User created: ${userId}`)
  } else if (createData.msg?.includes('already') || createData.code === 'email_exists' || createData.error === 'User already registered') {
    // User exists — look them up
    console.log('ℹ️  User already exists, fetching...')
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(EMAIL)}`, { headers })
    const listData = await listRes.json()
    const users = listData.users ?? listData
    userId = Array.isArray(users) ? users.find(u => u.email === EMAIL)?.id : users?.id
    if (!userId) {
      console.error('❌ Could not find user. Response:', JSON.stringify(listData))
      process.exit(1)
    }
    console.log(`✅ Found existing user: ${userId}`)
  } else {
    console.error('❌ Create user failed:', JSON.stringify(createData))
    process.exit(1)
  }

  // Step 2: Update password + set app_metadata
  console.log('🔄 Step 2: Set password + is_platform_admin metadata...')
  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { is_platform_admin: true },
    }),
  })
  const updateData = await updateRes.json()
  if (!updateRes.ok) {
    console.error('❌ Update failed:', JSON.stringify(updateData))
    process.exit(1)
  }
  console.log('✅ Password & metadata set')

  // Step 3: DB — platform_admins + profiles
  console.log('🔄 Step 3: Inserting into platform_admins + profiles...')
  const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql: `
      -- Ensure platform_admins table exists
      CREATE TABLE IF NOT EXISTS platform_admins (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      );

      -- Grant super admin
      INSERT INTO platform_admins (user_id, is_active)
      VALUES ('${userId}', true)
      ON CONFLICT (user_id) DO UPDATE SET is_active = true;

      -- Update profiles flag
      UPDATE profiles SET is_super_admin = true WHERE id = '${userId}';
    `})
  })

  // exec_sql may not exist — use direct REST inserts instead
  // Insert into platform_admins via REST
  const paRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_admins`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, is_active: true }),
  })
  console.log(`  platform_admins upsert: ${paRes.status}`)

  // Update profiles
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ is_super_admin: true }),
  })
  console.log(`  profiles update: ${profRes.status}`)

  console.log('\n🎉 DONE! Super admin setup complete.')
  console.log(`   Email:    ${EMAIL}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log(`   URL:      http://localhost:3000/super-admin`)
  console.log('\n⚠️  Sign out and sign back in for the JWT to refresh with the new metadata.')
}

run().catch(console.error)
