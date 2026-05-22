import { NextRequest, NextResponse } from 'next/server'

/**
 * Meta WhatsApp Business API — Send real WhatsApp messages
 * POST /api/whatsapp/send
 * Body: { to: string, message: string, leadId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { to, message, leadId } = await req.json()
    if (!to || !message) {
      return NextResponse.json({ error: 'Missing: to, message' }, { status: 400 })
    }

    const TOKEN = process.env.META_WHATSAPP_TOKEN
    const PHONE_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID

    // Helper: log to Supabase CRM interactions
    async function logToCRM(userId: string) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      if (leadId) {
        await supabase.from('interactions').insert({
          user_id: userId, lead_id: leadId, type: 'whatsapp',
          direction: 'outbound', content_raw: message,
          created_at: new Date().toISOString(),
        })
        await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', leadId)
      }
    }

    // Determine if Meta WhatsApp is actually configured (non-empty, non-placeholder values)
    const isMetaConfigured = TOKEN && TOKEN.length > 10 && !TOKEN.startsWith('replace') &&
      PHONE_ID && PHONE_ID.length > 5 && !PHONE_ID.startsWith('replace')

    if (!isMetaConfigured) {
      // Mock/sandbox mode — log to CRM only
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await logToCRM(user.id)
      return NextResponse.json({
        success: true, mock: true,
        message: 'WhatsApp message logged to CRM (Meta API not configured — add META_WHATSAPP_TOKEN to .env)',
      })
    }

    // Attempt to send via real Meta WhatsApp API
    const res = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''), // strip non-digits
        type: 'text',
        text: { body: message },
      }),
    })

    const data = await res.json()

    // Meta API auth failure (401) — token is invalid or expired
    // Fall back to CRM-only logging so the user's workflow isn't broken
    if (res.status === 401) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await logToCRM(user.id)
      return NextResponse.json({
        success: true,
        mock: true,
        metaError: data.error?.message || 'Meta token expired or invalid',
        message: 'Message logged to CRM — Meta token is invalid or expired. Refresh your token at developers.facebook.com.',
      })
    }

    if (!res.ok) {
      return NextResponse.json({
        error: `Meta API error (${res.status}): ${data.error?.message || 'WhatsApp send failed'}`,
      }, { status: 502 })
    }

    // Success — log to CRM
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await logToCRM(user.id)

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Meta WhatsApp Webhook Verification
 * GET /api/whatsapp/send?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}
