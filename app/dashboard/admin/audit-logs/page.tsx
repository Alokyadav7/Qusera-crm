import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { AuditLogsClient } from './audit-logs-client'

export default async function AuditLogsPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()

  // Resolve this user's company_id — MUST scope audit logs to own company
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const companyId: string | null = member?.company_id ?? null

  // Fetch audit logs scoped to this company only — never expose cross-company data
  const { data: logs } = await (svc as any)
    .from('audit_logs')
    .select('*')
    .eq('company_id', companyId ?? '')
    .order('created_at', { ascending: false })
    .limit(200)

  return <AuditLogsClient initialLogs={logs ?? []} />
}
