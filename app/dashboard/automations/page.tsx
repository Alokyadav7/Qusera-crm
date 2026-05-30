import { createServiceClient } from '@/lib/supabase/service'
import { AutomationsPageClient } from './automations-page-client'

export const dynamic = 'force-dynamic'

export default async function AutomationsPage() {
  const supabase = createServiceClient()

  const [
    { data: automations },
    { data: logs },
  ] = await Promise.all([
    (supabase as any).from('automations').select('*').order('created_at', { ascending: false }),
    (supabase as any).from('automation_logs').select('*, automation:automations(name)').order('triggered_at', { ascending: false }).limit(100),
  ])

  return (
    <AutomationsPageClient 
      initialAutomations={automations ?? []} 
      initialLogs={logs ?? []} 
    />
  )
}
