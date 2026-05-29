import { createServiceClient } from '@/lib/supabase/service'
import { DealsPageClient } from './deals-page-client'

export default async function DealsPage() {
  const supabase = createServiceClient()
  const { data: deals } = await (supabase as any)
    .from('deals')
    .select('*, contact:contacts(full_name, email)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return <DealsPageClient initialDeals={deals ?? []} />
}
