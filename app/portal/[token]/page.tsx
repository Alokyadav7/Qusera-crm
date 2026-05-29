import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { PortalPageClient } from './portal-client'

interface Props { params: Promise<{ token: string }> }

export default async function PortalPage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  // Validate token
  const { data: portalToken } = await (supabase as any)
    .from('deal_portal_tokens')
    .select('id, deal_id, company_id, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!portalToken) notFound()

  // Fetch deal
  const { data: deal } = await (supabase as any)
    .from('deals')
    .select('id, title, value, currency, stage, close_date, notes, probability')
    .eq('id', (portalToken as any).deal_id)
    .single()

  // Fetch deal products
  const { data: products } = await (supabase as any)
    .from('deal_products')
    .select('product_name, qty, unit_price, discount_pct, total')
    .eq('deal_id', (portalToken as any).deal_id)

  // Fetch portal events (comments from client)
  const { data: events } = await (supabase as any)
    .from('deal_portal_events')
    .select('event_type, comment, signature, created_at')
    .eq('token_id', (portalToken as any).id)
    .order('created_at')

  // Log view event
  await (supabase as any).from('deal_portal_events').insert({
    token_id: (portalToken as any).id,
    event_type: 'viewed',
    created_at: new Date().toISOString(),
  })

  return (
    <PortalPageClient
      tokenId={(portalToken as any).id}
      deal={deal}
      products={products ?? []}
      events={events ?? []}
    />
  )
}
