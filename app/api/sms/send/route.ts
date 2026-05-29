import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const { phone, message, contact_id, company_id } = await req.json()

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: 'phone and message are required' }, { status: 400 })
    }

    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 10 SMS per minute per company
    if (company_id) {
      const rl = checkRateLimit('sms', company_id)
      const denied = rateLimitResponse(rl)
      if (denied) return denied
    }

    // Get Fast2SMS credentials: first try integrations table, then env vars
    const supabase = createServiceClient()
    let apiKey = process.env.FAST2SMS_API_KEY || null
    let senderId = process.env.FAST2SMS_SENDER_ID || 'FSTSMS'

    try {
      const { data: intg } = await (supabase as any)
        .from('integrations')
        .select('fast2sms_api_key, fast2sms_sender_id')
        .eq('user_id', user.id)
        .single()
      if (intg?.fast2sms_api_key) {
        apiKey = intg.fast2sms_api_key
        senderId = intg.fast2sms_sender_id || senderId
      }
    } catch { /* use env fallback */ }

    let messageId: string | null = null
    let status: 'sent' | 'failed' | 'pending' = 'pending'

    if (apiKey) {
      try {
        const cleanPhone = phone.replace(/\D/g, '').slice(-10)
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            route: 'q',
            sender_id: senderId,
            message,
            language: 'english',
            flash: '0',
            numbers: cleanPhone,
          }).toString(),
        })
        const data = await res.json()
        if (data.return === true) {
          messageId = data.request_id || null
          status = 'sent'
        } else {
          status = 'failed'
          return NextResponse.json({ success: false, error: data.message || 'Fast2SMS rejected the request' }, { status: 422 })
        }
      } catch (err: any) {
        return NextResponse.json({ success: false, error: 'SMS gateway unreachable: ' + err.message }, { status: 503 })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'SMS not configured. Add FAST2SMS_API_KEY to .env or configure in Integrations settings.',
        setup_required: true,
      }, { status: 503 })
    }

    // Log to sms_messages table
    await (supabase as any).from('sms_messages').insert({
      company_id: company_id || null,
      contact_id: contact_id || null,
      user_id: user.id,
      phone,
      message,
      status,
      fast2sms_ref: messageId,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, status, message_id: messageId })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
