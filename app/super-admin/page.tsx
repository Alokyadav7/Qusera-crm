import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuperAdminOverviewClient } from './super-admin-client'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify super admin
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_super_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.is_super_admin) redirect('/dashboard')

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Fetch platform stats
  const [
    { count: totalCompanies },
    { count: totalUsers },
    { count: totalLeads },
    { count: newThisMonth },
    { count: actionsThisMonth },
    { data: recentCompanies },
  ] = await Promise.all([
    (supabase as any).from('companies').select('*', { count: 'exact', head: true }),
    (supabase as any).from('profiles').select('*', { count: 'exact', head: true }),
    (supabase as any).from('leads').select('*', { count: 'exact', head: true }),
    (supabase as any).from('companies').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    (supabase as any).from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    (supabase as any).from('companies')
      .select('id, name, created_at, setup_complete')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <SuperAdminOverviewClient
      adminName={(profile as any)?.full_name || user.email || 'Admin'}
      stats={{
        totalCompanies: totalCompanies ?? 0,
        totalUsers: totalUsers ?? 0,
        totalLeads: totalLeads ?? 0,
        newThisMonth: newThisMonth ?? 0,
        actionsThisMonth: actionsThisMonth ?? 0,
      }}
      recentCompanies={recentCompanies ?? []}
    />
  )
}
