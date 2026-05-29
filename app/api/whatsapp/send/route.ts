import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface WAConfig {
  phone_number_id: string
  access_token: string
  phone_number: string
}

interface Lead {
  phone: string | null
  full_name: string | null
}

/**
 * POST /api/whatsapp/send
 * Sends a WhatsApp message using the COMPANY'S OWN phone_number_id + access_token
 * fetched from company_whatsapp table — fully isolated per company.
 *
 * Body: { lead_id: string, message: string }
 */
export async function POST(req: NextRequest) {
  try {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { lead_id, message } = await req.json()
    if (!lead_id || !message?.trim()) {
      return NextResponse.json(
        { error: 'lead_id and message are required', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }

    const svc = createServiceClient()

    // Get caller's company_id
    const { data: memberData } = await (svc as any)
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const companyId: string | null = memberData?.company_id ?? null
    if (!companyId) {
      return NextResponse.json({ error: 'No active company found', code: 'NO_COMPANY' }, { status: 403 })
    }

    // Get this company's WhatsApp config
    const { data: waConfig } = await (svc as any)
      .from('company_whatsapp')
      .select('phone_number_id, access_token, phone_number')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single() as { data: WAConfig | null }

    if (!waConfig) {
      return NextResponse.json(
        {
          error: 'WhatsApp not connected for your company. Go to Settings → Integrations to connect.',
          code: 'WA_NOT_CONNECTED',
        },
        { status: 400 }
      )
    }

    // Get lead details (scoped to same company)
    const { data: lead } = await (svc as any)
      .from('leads')
      .select('phone, full_name')
      .eq('id', lead_id)
      .eq('company_id', companyId)
      .single() as { data: Lead | null }

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found', code: 'LEAD_NOT_FOUND' }, { status: 404 })
    }

    const toPhone = (lead.phone ?? '').replace(/[^\d+]/g, '')
    if (!toPhone) {
      return NextResponse.json(
        { error: 'Lead has no phone number', code: 'NO_PHONE' },
        { status: 400 }
      )
    }

    // ── Send via Meta API using COMPANY'S OWN token ───────────────────────────
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${waConfig.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${waConfig.access_token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone.startsWith('+') ? toPhone.slice(1) : toPhone,
          type: 'text',
          text: { body: message.trim() },
        }),
      }
    )

    const metaData = await metaRes.json()

    if (!metaRes.ok || metaData.error) {
      // Check for expired token
      if (metaData.error?.code === 190) {
        return NextResponse.json(
          {
            error: 'WhatsApp token expired. Please reconnect at Settings → Integrations.',
            code: 'TOKEN_EXPIRED',
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        {
          error: metaData.error?.message ?? 'Failed to send via WhatsApp',
          code: 'WA_SEND_FAILED',
          meta_error: metaData.error,
        },
        { status: 502 }
      )
    }

    const waMessageId: string = metaData.messages?.[0]?.id ?? null

    // ── Log to whatsapp_messages ──────────────────────────────────────────────
    await (svc as any).from('whatsapp_messages').insert({
      company_id: companyId,
      lead_id,
      phone_number_id: waConfig.phone_number_id,
      wa_message_id: waMessageId,
      direction: 'outbound',
      from_number: waConfig.phone_number,
      to_number: toPhone,
      message_text: message.trim(),
      message_type: 'text',
      status: 'sent',
      created_at: new Date().toISOString(),
    })

    // ── Interactions timeline ─────────────────────────────────────────────────
    await (svc as any).from('interactions').insert({
      company_id: companyId,
      lead_id,
      user_id: user.id,
      type: 'whatsapp',
      direction: 'outbound',
      content_raw: message.trim(),
      created_at: new Date().toISOString(),
    })

    // ── Update lead last_contacted_at ─────────────────────────────────────────
    await (svc as any)
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', lead_id)

    // ── Audit log ─────────────────────────────────────────────────────────────
    await (svc as any).from('audit_logs').insert({
      company_id: companyId,
      user_id: user.id,
      action: 'whatsapp.sent',
      resource: 'lead',
      details: { lead_id, to: toPhone, preview: message.substring(0, 60) },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message_id: waMessageId })
  } catch (err: any) {
    console.error('WhatsApp send error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Unexpected error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
