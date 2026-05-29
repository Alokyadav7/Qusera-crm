import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Fast2SMS Inbound SMS Webhook
 * POST /api/webhooks/sms
 *
 * Fast2SMS sends inbound SMS to this URL via their "Incoming SMS" settings.
 * Payload: { mobile, message, time, sender_id }
 */

export async function POST(req: NextRequest) {
  try {
    // Fast2SMS sends form-encoded or JSON depending on config
    let payload: Record<string, string> = {}
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      // form-urlencoded
      const text = await req.text()
      for (const part of text.split('&')) {
        const [k, v] = part.split('=')
        if (k) payload[decodeURIComponent(k)] = decodeURIComponent(v || '')
      }
    }

    const mobile: string = payload.mobile || payload.sender || ''
    const message: string = payload.message || payload.text || ''
    const timestamp = payload.time
      ? new Date(parseInt(payload.time) * 1000).toISOString()
      : new Date().toISOString()

    if (!mobile || !message) {
      return NextResponse.json({ error: 'Missing mobile or message' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const cleanPhone = mobile.replace(/\D/g, '').slice(-10)

    // Get default company
    const { data: companies } = await (supabase as any).from('companies').select('id').limit(1)
    const defaultCompanyId = companies?.[0]?.id || null

    // Find lead by phone
    const { data: lead } = await (supabase as any)
      .from('leads')
      .select('id, user_id, company_id')
      .ilike('phone_number', `%${cleanPhone}%`)
      .maybeSingle()

    let leadId: string | null = null
    let leadUserId: string | null = null
    let companyId: string | null = defaultCompanyId

    if (lead) {
      leadId = lead.id
      leadUserId = lead.user_id
      companyId = lead.company_id || defaultCompanyId
    } else {
      // Create new lead from inbound SMS
      const { data: ownerRows } = await (supabase as any)
        .from('user_active_company')
        .select('user_id, company_id')
        .eq('company_id', defaultCompanyId)
        .limit(1)
      const owner = ownerRows?.[0]

      if (owner) {
        const { data: newLead } = await (supabase as any)
          .from('leads')
          .insert({
            user_id: owner.user_id,
            company_id: owner.company_id,
            full_name: `SMS Lead (+${mobile})`,
            phone_number: `+${mobile}`,
            status: 'new',
            source: 'sms_inbound',
            buying_intent: 'medium',
            sentiment_score: 0,
            created_at: timestamp,
            updated_at: timestamp,
          })
          .select()
          .single()

        if (newLead) {
          leadId = newLead.id
          leadUserId = owner.user_id
          companyId = owner.company_id
        }
      }
    }

    // Log to sms_messages
    await (supabase as any).from('sms_messages').insert({
      company_id: companyId,
      lead_id: leadId,
      user_id: leadUserId,
      phone: mobile,
      message,
      direction: 'inbound',
      status: 'received',
      created_at: timestamp,
    })

    // Log to interactions timeline
    if (leadId && leadUserId) {
      await (supabase as any).from('interactions').insert({
        user_id: leadUserId,
        company_id: companyId,
        lead_id: leadId,
        type: 'sms',
        direction: 'inbound',
        content_raw: message,
        ai_summary: `SMS inbound: ${message.substring(0, 100)}`,
        created_at: timestamp,
      })

      // Notify assigned rep
      await (supabase as any).from('notifications').insert({
        company_id: companyId,
        user_id: leadUserId,
        title: `New SMS from ${mobile}`,
        body: message.substring(0, 120),
        entity_type: 'message',
        entity_id: leadId,
        read: false,
        created_at: timestamp,
      })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Fast2SMS sends GET for verification on some setups
export async function GET() {
  return NextResponse.json({ status: 'SMS webhook active' })
}

