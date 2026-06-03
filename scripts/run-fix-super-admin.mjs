// Create missing profile row + complete super-admin setup for info@qusera.in
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eqllqrppeodrhalpiajx.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxbGxxcnBwZW9kcmhhbHBpYWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2NzQ5MiwiZXhwIjoyMDkzNjQzNDkyfQ.tP-MhWOW0PuhFXXTA39YWiO5dHlmmUG1gtjF-pSpKyE'

const ADMIN_EMAIL = 'info@qusera.in'
const ADMIN_USER_ID = '15ac0cc0-dc51-4e16-ab99-321808abee64'

const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log(`\n🔧 Creating/fixing profile row for ${ADMIN_EMAIL}...`)

// Upsert the profile row (create if missing, update if exists)
const { data: profileData, error: profileErr } = await svc.from('profiles').upsert({
  id: ADMIN_USER_ID,
  email: ADMIN_EMAIL,
  full_name: 'Super Admin',
  is_super_admin: true,
  is_active: true,
  onboarding_completed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}, { onConflict: 'id' })

if (profileErr) {
  console.error('❌ Profile upsert failed:', profileErr.message)
  console.log('\nTrying minimal upsert (without email column)...')
  // Some schemas don't have email column in profiles — try without it
  const { error: err2 } = await svc.from('profiles').upsert({
    id: ADMIN_USER_ID,
    full_name: 'Super Admin',
    is_super_admin: true,
    is_active: true,
    onboarding_completed: true,
  }, { onConflict: 'id' })
  if (err2) console.error('❌ Minimal upsert also failed:', err2.message)
  else console.log('✅ Profile upserted (minimal)')
} else {
  console.log('✅ Profile row created/updated')
}

// Final verification
console.log('\n🔍 Final verification...')
const { data: paRow } = await svc.from('platform_admins').select('is_active').eq('user_id', ADMIN_USER_ID).maybeSingle()
const { data: profileRow } = await svc.from('profiles').select('is_super_admin, is_active, onboarding_completed, full_name').eq('id', ADMIN_USER_ID).maybeSingle()
const { data: updatedUser } = await svc.auth.admin.getUserById(ADMIN_USER_ID)

console.log('\n📊 FINAL VERIFICATION:')
console.log('═'.repeat(55))
console.log(`  Email:                       ${ADMIN_EMAIL}`)
console.log(`  User ID:                     ${ADMIN_USER_ID}`)
console.log(`  platform_admins.is_active:   ${paRow?.is_active === true ? '✅ true' : '❌ ' + paRow?.is_active}`)
console.log(`  profiles.is_super_admin:     ${profileRow?.is_super_admin === true ? '✅ true' : '❌ ' + profileRow?.is_super_admin}`)
console.log(`  profiles.is_active:          ${profileRow?.is_active === true ? '✅ true' : '❌ ' + profileRow?.is_active}`)
console.log(`  profiles.onboarding_done:    ${profileRow?.onboarding_completed === true ? '✅ true' : '❌ ' + profileRow?.onboarding_completed}`)
console.log(`  profiles.full_name:          ${profileRow?.full_name || '(empty)'}`)
console.log(`  app_meta.is_platform_admin:  ${updatedUser?.user?.app_metadata?.is_platform_admin === true ? '✅ true' : '❌ ' + updatedUser?.user?.app_metadata?.is_platform_admin}`)
console.log('═'.repeat(55))

const allGood = paRow?.is_active && profileRow?.is_super_admin && updatedUser?.user?.app_metadata?.is_platform_admin
console.log(allGood
  ? '\n🎉 SUCCESS! Login with info@qusera.in → should redirect to /super-admin'
  : '\n⚠️  Some flags still missing — check output above.')
