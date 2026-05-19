import { NextRequest, NextResponse } from 'next/server'

/**
 * Real Email Sending via Resend API
 * POST /api/email/send
 * Body: { to: string[], subject: string, html: string, leadId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text, leadId } = await req.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html/text' }, { status: 400 })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const FROM = process.env.RESEND_FROM_EMAIL || 'crm@yourdomain.com'

    if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_replace')) {
      // Return mock success if key not configured yet
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Email queued (Resend API key not configured — add RESEND_API_KEY to .env)',
        recipients: to,
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `OrbitCRM <${FROM}>`,
        to,
        subject,
        html: html || `<p>${text}</p>`,
        text: text || '',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Email send failed' }, { status: res.status })
    }

    // Log to Supabase interactions if leadId provided
    if (leadId) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('interactions').insert({
          user_id: user.id,
          lead_id: leadId,
          type: 'email',
          direction: 'outbound',
          content_raw: subject,
          ai_summary: `Email sent: ${subject}`,
          created_at: new Date().toISOString(),
        })
        await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', leadId)
      }
    }

    return NextResponse.json({ success: true, id: data.id, recipients: to })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
