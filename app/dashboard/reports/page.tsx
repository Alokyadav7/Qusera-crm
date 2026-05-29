import { createServiceClient } from '@/lib/supabase/service'
import { ReportsPageClient } from './reports-client'

export default async function ReportsPage() {
  const supabase = createServiceClient()

  const [
    { data: reports },
    { data: leads },
    { data: deals },
  ] = await Promise.all([
    (supabase as any).from('saved_reports').select('*').order('created_at', { ascending: false }),
    supabase.from('leads').select('buying_intent, deal_value, status, source'),
    (supabase as any).from('deals').select('stage, value, probability'),
  ])

  return (
    <ReportsPageClient
      initialReports={reports ?? []}
      leads={leads ?? []}
      deals={deals ?? []}
    />
  )
}
