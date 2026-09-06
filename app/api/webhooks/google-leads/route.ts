import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

// ── Google Lead Gen Form Webhook ──────────────────────────────────────────────
const WEBHOOK_KEY = process.env.GOOGLE_LEADS_WEBHOOK_KEY

function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

export async function GET() {
  return NextResponse.json({ status: 'KlinqCRM Google Lead Webhook Active' })
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key') || request.headers.get('x-goog-signature')

    if (!WEBHOOK_KEY) {
      return NextResponse.json({ error: 'Google Leads webhook key not configured' }, { status: 503 })
    }

    // Authenticate request securely
    if (!key || !secureCompare(key, WEBHOOK_KEY)) {
      console.warn('[Google Lead Webhook] Unauthorized attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[Google Lead Webhook] Received:', JSON.stringify(body))

    const customerId = body.google_ads_client_customer_id || body.client_customer_id || body.customer_id || body.google_ads_customer_id
    const companyIdParam = searchParams.get('company_id')

    const supabase = await createClient()

    // ── Map company using Google Ads Customer ID ───────────────────
    let companyId = companyIdParam
    let ownerId = null

    if (customerId) {
      const { data: intg } = await supabase
        .from('integrations')
        .select('user_id')
        .eq('google_ads_customer_id', String(customerId))
        .maybeSingle()

      if (intg?.user_id) {
        ownerId = intg.user_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', intg.user_id)
          .maybeSingle()
        if (profile?.company_id) {
          companyId = profile.company_id
        }
      }
    }

    if (!companyId) {
      console.warn('[Google Lead Webhook] Missing company mapping or company_id query parameter')
      return NextResponse.json({ error: 'company_id or Google Ads account mapping is required' }, { status: 400 })
    }

    // Verify company exists and get owner
    const { data: company, error: companyErr } = await (supabase as any)
      .from('companies')
      .select('id, owner_id')
      .eq('id', companyId)
      .single()

    if (companyErr || !company) {
      console.warn(`[Google Lead Webhook] Company not found for ID: ${companyId}`)
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (!ownerId) {
      ownerId = company.owner_id || null
    }

    const leadId = body.lead_id || body.id
    const columnData: { column_name: string; string_value: string }[] = body.user_column_data || []

    const fields: Record<string, string> = {}
    for (const col of columnData) {
      fields[col.column_name.toLowerCase().replace(/\s+/g, '_')] = col.string_value || ''
    }

    const fullName = fields.full_name || fields.name ||
      (`${fields.first_name || ''} ${fields.last_name || ''}`).trim() || 'Google Lead'

    const { data: newLead, error } = await (supabase as any).from('leads').insert({
      user_id: ownerId,
      company_id: company.id,
      full_name: fullName,
      email: fields.email || null,
      phone: fields.phone_number || fields.phone || null,
      company: fields.company || fields.company_name || null,
      city: fields.city || null,
      source: 'Google Ads',
      status: 'new',
      buying_intent: 'high',
      sentiment_score: 0,
      gst_status: 'pending',
      pan_status: 'pending',
      google_lead_id: leadId,
      google_campaign_id: body.campaign_id ? String(body.campaign_id) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single()

    if (error) {
      console.error('[Google Lead Webhook] Insert lead error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (newLead && ownerId) {
      await (supabase as any).from('notifications').insert({
        user_id: ownerId,
        company_id: company.id,
        title: `New Google Ads Lead: ${fullName}`,
        body: `${fields.email || fields.phone || ''} · Campaign: ${body.campaign_name || body.campaign_id || 'Unknown'}`,
        entity_type: 'lead',
        entity_id: newLead.id,
        read: false,
        created_at: new Date().toISOString(),
      })
      console.log(`[Google Lead Webhook] Lead saved: ${fullName}`)
    }

    return NextResponse.json({ status: 'received', lead_id: leadId })
  } catch (err: any) {
    console.error('[Google Lead Webhook] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
