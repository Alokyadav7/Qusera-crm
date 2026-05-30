import { createServiceClient } from '@/lib/supabase/service'
import { BillingClient } from './billing-client'

export const dynamic = 'force-dynamic'

async function getBillingData() {
  const svc = createServiceClient()

  const [
    { data: subscriptions },
    { data: invoices },
    { data: plans },
  ] = await Promise.all([
    svc.from('subscriptions').select('*, company:companies(id, name, slug, status)').order('created_at', { ascending: false }),
    svc.from('invoices').select('*').order('created_at', { ascending: false }).limit(50),
    svc.from('plans').select('*').order('price_monthly', { ascending: true }),
  ])

  return {
    subscriptions: (subscriptions ?? []) as any[],
    invoices: (invoices ?? []) as any[],
    plans: (plans ?? []) as any[],
  }
}

export default async function SuperAdminBillingPage() {
  const data = await getBillingData()
  return (
    <BillingClient
      initialSubscriptions={data.subscriptions}
      initialInvoices={data.invoices}
      plans={data.plans}
    />
  )
}
