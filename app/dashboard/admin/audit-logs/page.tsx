import { createServiceClient } from '@/lib/supabase/service'
import { AuditLogsClient } from './audit-logs-client'

export default async function AuditLogsPage() {
  const supabase = createServiceClient()

  const { data: logs } = await (supabase as any)
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return <AuditLogsClient initialLogs={logs ?? []} />
}
