import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/monitoring
// Returns REAL service status + 24h platform activity counts (NO fake metrics)
export const GET = withSuperAdmin(async (_req: NextRequest, _adminId: string) => {
  const svc = createServiceClient()
  const now = new Date()
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // ── 1. Database health check (real ping) ──────────────────────────────
  let dbOnline = false
  let dbLatencyMs = 0
  const dbStart = Date.now()
  try {
    const { error } = await svc.from('companies').select('id').limit(1).single()
    dbOnline = !error || error.code === 'PGRST116' // PGRST116 = "no rows" — still online
    dbLatencyMs = Date.now() - dbStart
  } catch {
    dbOnline = false
  }

  // ── 2. Environment config status (presence check only — no values) ────
  const envStatus = {
    gmail: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
    whatsapp: !!process.env.META_SYSTEM_USER_TOKEN,
    sms: !!process.env.FAST2SMS_API_KEY,
  }

  // ── 3. 24h platform activity from real tables ────────────────────────
  const [
    { count: logins24h },
    { count: failedLogins24h },
    { count: leadsCreated24h },
    { count: emailsSent24h },
    { count: whatsappSent24h },
    { data: alerts },
    { data: recentErrors },
    { count: pendingJobs },
    { count: failedJobs },
    { count: processingJobs },
    { data: failedJobList },
  ] = await Promise.all([
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'user.login_success').gte('created_at', h24Ago),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'user.login_failed').gte('created_at', h24Ago),
    svc.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', h24Ago).is('deleted_at', null),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'email.sent').gte('created_at', h24Ago),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'whatsapp.sent').gte('created_at', h24Ago),
    svc.from('platform_alerts').select('id, severity, title, company_name, created_at').eq('is_resolved', false).order('created_at', { ascending: false }).limit(50),
    svc.from('audit_logs').select('id, action, company_id, created_at, companies:company_id(name)').or('action.ilike.%.failed,action.ilike.%.error').order('created_at', { ascending: false }).limit(20),
    (svc as any).from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    (svc as any).from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    (svc as any).from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    (svc as any).from('job_queue').select('id, task_name, error_message, attempts, created_at').eq('status', 'failed').order('created_at', { ascending: false }).limit(10),
  ])

  return NextResponse.json({
    services: {
      database: { online: dbOnline, latencyMs: dbLatencyMs },
      email: { configured: envStatus.gmail },
      whatsapp: { configured: envStatus.whatsapp },
      sms: { configured: envStatus.sms },
    },
    activity24h: {
      logins: logins24h ?? 0,
      failedLogins: failedLogins24h ?? 0,
      leadsCreated: leadsCreated24h ?? 0,
      emailsSent: emailsSent24h ?? 0,
      whatsappSent: whatsappSent24h ?? 0,
    },
    queue: {
      pending: pendingJobs ?? 0,
      failed: failedJobs ?? 0,
      processing: processingJobs ?? 0,
    },
    failedJobs: ((failedJobList as any[]) ?? []).map((j: any) => ({
      id: j.id,
      task_name: j.task_name,
      error_message: j.error_message ?? 'Unknown error',
      attempts: j.attempts ?? 0,
      created_at: j.created_at,
    })),
    alerts: (alerts ?? []),
    recentErrors: ((recentErrors ?? []) as any[]).map((e: any) => ({
      id: e.id,
      action: e.action,
      company_name: (e.companies as any)?.name ?? 'Platform',
      created_at: e.created_at,
    })),
  })
})
