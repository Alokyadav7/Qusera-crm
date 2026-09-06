// Fix broken Qusera company — targeted fast fix
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log('\n🔍 Finding Qusera company...')

// Find company directly
const { data: companies, error: compErr } = await svc
  .from('companies')
  .select('id, name, slug, owner_id, is_active')

if (compErr) { console.error('❌ DB error:', compErr.message); process.exit(1) }

console.log('\nAll companies in DB:')
companies.forEach(c => console.log(` - "${c.name}" | slug: ${c.slug} | owner_id: ${c.owner_id} | id: ${c.id}`))

const queseraCompany = companies.find(c =>
  c.name?.toLowerCase().includes('qusera') ||
  c.slug?.toLowerCase().includes('qusera')
)

if (!queseraCompany) {
  console.log('\n⚠️  No Qusera company found. Check company names above.')
  process.exit(0)
}

console.log(`\n✅ Found: "${queseraCompany.name}" (id: ${queseraCompany.id})`)

// Get owner from company_members or owner_id field
let ownerId = queseraCompany.owner_id

if (!ownerId) {
  const { data: members } = await svc
    .from('company_members')
    .select('user_id, role')
    .eq('company_id', queseraCompany.id)
    .order('role')
  console.log('Members:', members)
  ownerId = members?.find(m => m.role === 'owner')?.user_id || members?.[0]?.user_id
}

if (!ownerId) {
  // Check profiles for this company
  const { data: profilesForCompany } = await svc
    .from('profiles')
    .select('id, email, role')
    .eq('company_id', queseraCompany.id)
  console.log('Profiles for this company:', profilesForCompany)
  ownerId = profilesForCompany?.[0]?.id
}

if (!ownerId) {
  console.error('❌ Cannot find owner for this company. Check output above.')
  process.exit(1)
}

console.log(`\n✅ Owner ID: ${ownerId}`)

// Get owner email from profiles
const { data: ownerProfile } = await svc.from('profiles').select('email, full_name').eq('id', ownerId).maybeSingle()
const ownerEmail = ownerProfile?.email || 'unknown'
console.log(`✅ Owner email: ${ownerEmail}`)

// ── Fix profiles ─────────────────────────────────────────────────────────────
console.log('\n📝 Fixing profiles.company_id + role + onboarding_completed...')
const { error: pErr } = await svc.from('profiles').upsert({
  id: ownerId,
  company_id: queseraCompany.id,
  role: 'owner',
  is_active: true,
  is_super_admin: false,
  onboarding_completed: false,
  updated_at: new Date().toISOString(),
}, { onConflict: 'id' })
console.log(pErr ? `❌ profiles: ${pErr.message}` : '✅ profiles fixed')

// ── Fix company_members ───────────────────────────────────────────────────────
console.log('\n📝 Fixing company_members...')
const { error: mErr } = await svc.from('company_members').upsert({
  user_id: ownerId,
  company_id: queseraCompany.id,
  role: 'owner',
  is_active: true,
  joined_at: new Date().toISOString(),
}, { onConflict: 'user_id,company_id' })

if (mErr) {
  // onConflict target might differ — try plain insert
  const { error: mErr2 } = await svc.from('company_members').insert({
    user_id: ownerId,
    company_id: queseraCompany.id,
    role: 'owner',
    is_active: true,
    joined_at: new Date().toISOString(),
  })
  console.log(mErr2 ? `❌ company_members: ${mErr2.message}` : '✅ company_members created')
} else {
  console.log('✅ company_members fixed')
}

// ── Fix user_active_company ───────────────────────────────────────────────────
console.log('\n📝 Fixing user_active_company...')
const { error: aErr } = await svc.from('user_active_company').upsert({
  user_id: ownerId,
  company_id: queseraCompany.id,
  updated_at: new Date().toISOString(),
}, { onConflict: 'user_id' })

if (aErr) {
  const { error: aErr2 } = await svc.from('user_active_company').insert({
    user_id: ownerId,
    company_id: queseraCompany.id,
  })
  console.log(aErr2 ? `❌ user_active_company: ${aErr2.message}` : '✅ user_active_company created')
} else {
  console.log('✅ user_active_company fixed')
}

// ── Verify ────────────────────────────────────────────────────────────────────
console.log('\n🔍 Verifying...')
const [pRes, mRes, aRes] = await Promise.all([
  svc.from('profiles').select('company_id, role, is_active, onboarding_completed').eq('id', ownerId).maybeSingle(),
  svc.from('company_members').select('id').eq('user_id', ownerId).eq('company_id', queseraCompany.id).maybeSingle(),
  svc.from('user_active_company').select('company_id').eq('user_id', ownerId).maybeSingle(),
])

console.log('\n📊 RESULT:')
console.log('═'.repeat(55))
console.log(`  Owner:                    ${ownerEmail}`)
console.log(`  Company:                  ${queseraCompany.name}`)
console.log(`  profiles.company_id:      ${pRes.data?.company_id ? '✅' : '❌ MISSING'}`)
console.log(`  profiles.role:            ${pRes.data?.role === 'owner' ? '✅ owner' : '❌ ' + pRes.data?.role}`)
console.log(`  profiles.is_active:       ${pRes.data?.is_active ? '✅' : '❌'}`)
console.log(`  profiles.onboarding:      ${pRes.data?.onboarding_completed === false ? '✅ false → will go to /onboarding' : '⚠️ ' + pRes.data?.onboarding_completed}`)
console.log(`  company_members:          ${mRes.data ? '✅' : '❌ MISSING'}`)
console.log(`  user_active_company:      ${aRes.data ? '✅' : '❌ MISSING'}`)
console.log('═'.repeat(55))

console.log(
  pRes.data?.company_id && mRes.data && aRes.data
    ? '\n🎉 Fixed! Owner can now log in → redirected to /onboarding'
    : '\n⚠️  Some items still missing.'
)
