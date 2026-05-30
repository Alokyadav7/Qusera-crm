import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuperAdminOverviewClient } from './super-admin-client'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.is_super_admin) redirect('/dashboard')

  return (
    <SuperAdminOverviewClient
      adminName={(profile as any)?.full_name || user.email || 'Admin'}
    />
  )
}
