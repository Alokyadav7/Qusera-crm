import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/support/[company_id]
export const GET = withSuperAdmin(async (req: NextRequest, _adminId: string) => {
  const company_id = req.nextUrl.pathname.split('/').at(-1)! // /api/super-admin/support/[company_id]
  const svc = createServiceClient()

  const [
    { data: alerts },
    { data: impersonations },
    { data: integrations },
  ] = await Promise.all([
    // Unresolved alerts for this company
    svc
      .from('platform_alerts')
      .select('id, severity, title, description, created_at')
      .eq('company_id', company_id)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false }),

    // Impersonation audit log
    (svc as any)
      .from('audit_logs')
      .select('id, action, created_at, user_id, metadata, profiles:user_id(email, full_name)')
      .eq('company_id', company_id)
      .eq('action', 'super_admin.impersonation_started')
      .order('created_at', { ascending: false })
      .limit(20),

    // Integration status
    (svc as any)
      .from('company_integrations')
      .select('id, integration_type, is_active, status, last_tested_at, error_message, created_at')
      .eq('company_id', company_id),
  ])

  return NextResponse.json({
    alerts: (alerts ?? []),
    impersonations: ((impersonations ?? []) as any[]).map((log: any) => ({
      id: log.id,
      admin_email: (log.profiles as any)?.email ?? 'Unknown',
      admin_name: (log.profiles as any)?.full_name ?? null,
      started_at: log.created_at,
      metadata: log.metadata ?? {},
    })),
    integrations: ((integrations ?? []) as any[]).map((i: any) => ({
      id: i.id,
      type: i.integration_type,
      is_active: i.is_active,
      status: i.status ?? 'unknown',
      last_tested_at: i.last_tested_at ?? null,
      error_message: i.error_message ?? null,
      connected_at: i.created_at,
    })),
  })
})
