import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { computeHealthScore } from '@/lib/company-health'

// GET /api/super-admin/companies/[id]/health
export const GET = withSuperAdmin(async (req: NextRequest, _adminId: string) => {
  const id = req.nextUrl.pathname.split('/').at(-2)! // /api/super-admin/companies/[id]/health
  const svc = createServiceClient() as any // cast needed for new migration columns

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: company },
    { count: totalUsers },
    { count: activeUsers },
    { data: lastLogin },
    { count: failedIntegrations },
    { count: leadsThisMonth },
  ] = await Promise.all([
    svc.from('companies').select('id, status, setup_complete, is_active').eq('id', id).single(),
    svc.from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('is_active', true).is('deleted_at', null),
    svc.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('is_active', true).gte('last_login_at', thirtyDaysAgo),
    svc.from('profiles').select('last_login_at').eq('company_id', id).eq('is_active', true).order('last_login_at', { ascending: false }).limit(1),
    svc.from('company_integrations').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'error'),
    svc.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id).gte('created_at', monthStart).is('deleted_at', null),
  ])

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const lastLoginDate = (lastLogin as any)?.[0]?.last_login_at
  const daysSinceLastLogin = lastLoginDate
    ? Math.floor((now.getTime() - new Date(lastLoginDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const result = computeHealthScore({
    daysSinceLastLogin,
    onboardingComplete: (company as any).setup_complete ?? false,
    activeUsersLast30Days: activeUsers ?? 0,
    totalUsers: totalUsers ?? 0,
    failedIntegrations: failedIntegrations ?? 0,
    hasLeadsThisMonth: (leadsThisMonth ?? 0) > 0,
    planStatus: (company as any).is_active === false ? 'suspended' : ((company as any).status ?? 'active'),
  })

  // Cache score back to company row (best-effort)
  void svc.from('companies').update({
    health_score: result.score,
    health_status: result.status,
    health_checked_at: now.toISOString(),
  }).eq('id', id)

  return NextResponse.json(result)
})
