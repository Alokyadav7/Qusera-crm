import { createClient } from '@/lib/supabase/server'
import { InvoicesPageClient } from './invoices-client'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  // Use session client — service client bypasses RLS but invoices page
  // does its own client-side fetch on mount anyway, so empty here is fine
  let invoices: any[] = []
  let contacts: any[] = []
  let deals: any[] = []

  try {
    const supabase = await createClient()
    const [
      invRes,
      conRes,
      dealRes,
    ] = await Promise.all([
      (supabase as any).from('crm_invoices')
        .select('*, contact:contacts(full_name, email)')
        .order('created_at', { ascending: false }),
      supabase.from('contacts')
        .select('id, full_name, email')
        .is('deleted_at', null as any)
        .order('full_name', { ascending: true }),
      (supabase as any).from('deals')
        .select('id, title')
        .order('created_at', { ascending: false }),
    ])

    invoices = invRes.data ?? []
    contacts = conRes.data ?? []
    deals = dealRes.data ?? []
  } catch (err) {
    console.error('Failed to load initial invoices page data:', err)
  }

  return (
    <InvoicesPageClient
      initialInvoices={invoices}
      contacts={contacts}
      deals={deals}
    />
  )
}
