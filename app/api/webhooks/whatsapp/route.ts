import { NextRequest, NextResponse } from 'next/server'

/**
 * Meta WhatsApp Incoming Message Webhook
 * POST /api/webhooks/whatsapp
 * Meta sends message events here — we save them to Supabase interactions
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Meta webhook structure
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    if (!value?.messages?.length) {
      return NextResponse.json({ status: 'no_messages' })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    for (const msg of value.messages) {
      const from = msg.from // WhatsApp phone number
      const text = msg.type === 'text' ? msg.text?.body : `[${msg.type} message]`
      const timestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString()

      // Find lead by phone number
      const cleanPhone = from.replace(/\D/g, '')
      const { data: lead } = await supabase
        .from('leads')
        .select('id, user_id')
        .or(`phone_number.ilike.%${cleanPhone.slice(-10)}%`)
        .single()

      if (lead) {
        // Save incoming message to interactions
        await supabase.from('interactions').insert({
          user_id: lead.user_id,
          lead_id: lead.id,
          type: 'whatsapp',
          direction: 'inbound',
          content_raw: text,
          created_at: timestamp,
        })
        // Update lead last contact
        await supabase.from('leads').update({ last_contacted_at: timestamp }).eq('id', lead.id)
      } else {
        // Unknown number — create a new lead automatically
        const { data: users } = await supabase.from('leads').select('user_id').limit(1)
        const userId = users?.[0]?.user_id
        if (userId) {
          const { data: newLead } = await supabase.from('leads').insert({
            user_id: userId,
            full_name: `WhatsApp Lead (${from})`,
            phone_number: `+${from}`,
            status: 'new',
            source: 'whatsapp',
            buying_intent: 'medium',
            sentiment_score: 0,
            created_at: timestamp,
            updated_at: timestamp,
          }).select().single()

          if (newLead) {
            await supabase.from('interactions').insert({
              user_id: userId,
              lead_id: newLead.id,
              type: 'whatsapp',
              direction: 'inbound',
              content_raw: text,
              created_at: timestamp,
            })
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
