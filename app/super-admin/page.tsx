import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuperAdminOverviewClient } from './super-admin-client'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // NOTE: Super-admin access is already validated in layout.tsx (platform_admins table + user metadata).
  // We only need the profile to get the display name here.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <SuperAdminOverviewClient
      adminName={(profile as any)?.full_name || user.email || 'Admin'}
    />
  )
}

