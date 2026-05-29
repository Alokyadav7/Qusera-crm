import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createHmac } from 'crypto'

/**
 * GET /api/webhooks/whatsapp
 * Meta webhook verification — called once when you save the webhook URL in Meta Developer Console
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Verification failed', { status: 403 })
}

/**
 * POST /api/webhooks/whatsapp
 * Single endpoint that receives ALL inbound messages for ALL companies.
 * Routes each message to the correct company using phone_number_id stored in company_whatsapp.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // ── Security: Verify Meta HMAC signature ────────────────────────────────
    const APP_SECRET = process.env.META_APP_SECRET || process.env.META_WHATSAPP_APP_SECRET
    if (APP_SECRET) {
      const sig = req.headers.get('x-hub-signature-256') ?? ''
      const expected = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
      if (sig !== expected) {
        console.error('WhatsApp webhook: invalid signature')
        return new NextResponse('Unauthorized', { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)

    // Handle status updates (deliveries, reads) — always return 200
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    // Handle delivery/read receipts (update message status)
    if (value?.statuses?.length && !value?.messages?.length) {
      await handleStatusUpdate(value.statuses)
      return new NextResponse('OK', { status: 200 })
    }

    if (!value?.messages?.length) {
      return new NextResponse('OK', { status: 200 })
    }

    const phoneNumberId: string = value?.metadata?.phone_number_id
    if (!phoneNumberId) {
      return new NextResponse('OK', { status: 200 })
    }

    const svc = createServiceClient()

    // ── KEY: Find which company owns this phone_number_id ────────────────────
    const { data: waConfig } = await (svc as any)
      .from('company_whatsapp')
      .select('company_id, phone_number')
      .eq('phone_number_id', phoneNumberId)
      .eq('is_active', true)
      .single()

    if (!waConfig) {
      // Unknown phone number — ignore gracefully
      console.warn('WhatsApp webhook: unknown phone_number_id', phoneNumberId)
      return new NextResponse('OK', { status: 200 })
    }

    const companyId: string = waConfig.company_id
    const toNumber: string = waConfig.phone_number

    // Process each message
    for (const msg of value.messages) {
      await processInboundMessage({ svc, msg, value, companyId, phoneNumberId, toNumber })
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err)
    // Always return 200 to Meta — never let webhook fail permanently
    return new NextResponse('OK', { status: 200 })
  }
}

interface ProcessPayload {
  svc: ReturnType<typeof createServiceClient>
  msg: any
  value: any
  companyId: string
  phoneNumberId: string
  toNumber: string
}

async function processInboundMessage({
  svc, msg, value, companyId, phoneNumberId, toNumber,
}: ProcessPayload) {
  const fromNumber: string = msg.from
  const waMessageId: string = msg.id
  const msgType: string = msg.type ?? 'text'
  const receivedAt = new Date(parseInt(msg.timestamp) * 1000).toISOString()

  // Extract message content based on type
  let messageText = ''
  let mediaUrl: string | null = null
  if (msgType === 'text') {
    messageText = msg.text?.body ?? ''
  } else if (msgType === 'image') {
    messageText = msg.image?.caption ?? '[Image]'
    mediaUrl = msg.image?.id ?? null
  } else if (msgType === 'audio') {
    messageText = '[Voice message]'
  } else if (msgType === 'document') {
    messageText = msg.document?.filename ? `[Document: ${msg.document.filename}]` : '[Document]'
  } else if (msgType === 'video') {
    messageText = msg.video?.caption ?? '[Video]'
  } else {
    messageText = `[${msgType} message]`
  }

  // Contact name from Meta payload (if provided)
  const contactName: string =
    value?.contacts?.find((c: any) => c.wa_id === fromNumber)?.profile?.name ??
    `WhatsApp +${fromNumber}`

  // Normalize phone (remove country prefix for matching, keep full for display)
  const cleanPhone = fromNumber.replace(/\D/g, '')
  const last10 = cleanPhone.slice(-10)

  // ── Find or create lead in this company ──────────────────────────────────
  let { data: lead } = await (svc as any)
    .from('leads')
    .select('id, assigned_to')
    .eq('company_id', companyId)
    .or(`phone.ilike.%${last10}%,phone_number.ilike.%${last10}%`)
    .maybeSingle()

  if (!lead) {
    // Find default assignee (first active admin or member)
    const { data: defaultMember } = await (svc as any)
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .in('role', ['owner', 'admin', 'member'])
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const defaultUserId: string | null = defaultMember?.user_id ?? null

    const { data: newLead } = await (svc as any)
      .from('leads')
      .insert({
        company_id: companyId,
        full_name: contactName,
        phone: `+${fromNumber}`,
        source: 'whatsapp_inbound',
        status: 'new',
        assigned_to: defaultUserId,
        created_at: receivedAt,
        updated_at: receivedAt,
      })
      .select('id, assigned_to')
      .single()

    lead = newLead
  }

  if (!lead) return // DB error — skip silently

  // ── Save message ──────────────────────────────────────────────────────────
  await (svc as any).from('whatsapp_messages').insert({
    company_id: companyId,
    lead_id: lead.id,
    phone_number_id: phoneNumberId,
    wa_message_id: waMessageId,
    direction: 'inbound',
    from_number: `+${fromNumber}`,
    to_number: toNumber,
    message_text: messageText,
    message_type: msgType,
    media_url: mediaUrl,
    status: 'received',
    received_at: receivedAt,
    created_at: receivedAt,
  })

  // ── Interactions timeline ─────────────────────────────────────────────────
  await (svc as any).from('interactions').insert({
    company_id: companyId,
    lead_id: lead.id,
    user_id: lead.assigned_to,
    type: 'whatsapp',
    direction: 'inbound',
    content_raw: messageText,
    created_at: receivedAt,
  })

  // ── Update lead last_contacted_at ─────────────────────────────────────────
  await (svc as any)
    .from('leads')
    .update({ last_contacted_at: receivedAt, updated_at: receivedAt })
    .eq('id', lead.id)

  // ── Push notification to assigned rep ────────────────────────────────────
  if (lead.assigned_to) {
    await (svc as any).from('notifications').insert({
      company_id: companyId,
      user_id: lead.assigned_to,
      title: `New WhatsApp from ${contactName}`,
      body: messageText.substring(0, 120),
      entity_type: 'lead',
      entity_id: lead.id,
      read: false,
      created_at: receivedAt,
    })
  }
}

async function handleStatusUpdate(statuses: any[]) {
  const svc = createServiceClient()
  for (const statusObj of statuses) {
    const waMessageId: string = statusObj.id
    const status: string = statusObj.status // 'sent' | 'delivered' | 'read' | 'failed'
    const timestamp = new Date(parseInt(statusObj.timestamp) * 1000).toISOString()

    const updateFields: Record<string, any> = { status }
    if (status === 'delivered') updateFields.delivered_at = timestamp
    if (status === 'read') updateFields.read_at = timestamp
    if (status === 'failed') updateFields.error_message = statusObj.errors?.[0]?.title ?? 'Send failed'

    await (svc as any)
      .from('whatsapp_messages')
      .update(updateFields)
      .eq('wa_message_id', waMessageId)
  }
}
