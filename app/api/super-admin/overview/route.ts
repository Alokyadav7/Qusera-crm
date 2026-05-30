import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/overview
export const GET = withSuperAdmin(async (_req: NextRequest, _adminId: string) => {
  const svc = createServiceClient()

  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: trialCompanies },
    { count: suspendedCompanies },
    { count: totalUsers },
    { data: alerts },
    { data: activity },
    { count: healthyCount },
    { count: warningCount },
    { count: criticalCount },
  ] = await Promise.all([
    svc.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    (svc as any).from('companies').select('*', { count: 'exact', head: true }).eq('is_active', true).neq('status', 'trial').is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'trial').is('deleted_at', null),
    (svc as any).from('companies').select('*', { count: 'exact', head: true }).eq('is_active', false).is('deleted_at', null),
    (svc as any).from('profiles').select('*', { count: 'exact', head: true }).eq('is_super_admin', false).eq('is_active', true),
    svc.from('platform_alerts').select('id, severity, title, company_id, company_name, created_at').eq('is_resolved', false).order('created_at', { ascending: false }).limit(20),
    svc.from('audit_logs').select('id, action, created_at, company_id, companies:company_id(name)').order('created_at', { ascending: false }).limit(10),
    (svc as any).from('companies').select('*', { count: 'exact', head: true }).eq('health_status', 'healthy').is('deleted_at', null),
    (svc as any).from('companies').select('*', { count: 'exact', head: true }).eq('health_status', 'warning').is('deleted_at', null),
    (svc as any).from('companies').select('*', { count: 'exact', head: true }).eq('health_status', 'critical').is('deleted_at', null),
  ])

  return NextResponse.json({
    stats: {
      totalCompanies: totalCompanies ?? 0,
      activeCompanies: activeCompanies ?? 0,
      trialCompanies: trialCompanies ?? 0,
      suspendedCompanies: suspendedCompanies ?? 0,
      totalUsers: totalUsers ?? 0,
    },
    alerts: (alerts ?? []).map((a: any) => ({
      id: a.id,
      severity: a.severity,
      title: a.title,
      company_id: a.company_id,
      company_name: a.company_name,
      created_at: a.created_at,
    })),
    activity: ((activity ?? []) as any[]).map((log: any) => ({
      id: log.id,
      action: log.action,
      company_name: (log.companies as any)?.name ?? 'Platform',
      created_at: log.created_at,
    })),
    health: {
      healthy: healthyCount ?? 0,
      warning: warningCount ?? 0,
      critical: criticalCount ?? 0,
    },
  })
})
