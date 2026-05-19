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

    if (!TOKEN || TOKEN.startsWith('replace') || !PHONE_ID || PHONE_ID.startsWith('replace')) {
      // Mock mode — log to Supabase but don't actually send
      if (leadId) {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('interactions').insert({
            user_id: user.id, lead_id: leadId, type: 'whatsapp',
            direction: 'outbound', content_raw: message,
            created_at: new Date().toISOString(),
          })
          await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', leadId)
        }
      }
      return NextResponse.json({
        success: true, mock: true,
        message: 'WhatsApp logged to CRM (Meta API not configured — add META_WHATSAPP_TOKEN to .env)',
      })
    }

    // Send real WhatsApp via Meta API
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
    if (!res.ok) return NextResponse.json({ error: data.error?.message || 'WhatsApp send failed' }, { status: res.status })

    // Log to Supabase
    if (leadId) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('interactions').insert({
          user_id: user.id, lead_id: leadId, type: 'whatsapp',
          direction: 'outbound', content_raw: message,
          created_at: new Date().toISOString(),
        })
        await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', leadId)
      }
    }

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
