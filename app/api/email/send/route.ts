import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

/**
 * Real Email Sending via Resend API
 * POST /api/email/send
 * Body: { to: string[], subject: string, html?: string, text?: string, leadId?: string, contactId?: string }
 */

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text, leadId, contactId } = await req.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html/text' }, { status: 400 })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'

    if (!RESEND_API_KEY) {
      return NextResponse.json({
        error: 'Email not configured. Add RESEND_API_KEY to .env',
        setup_required: true,
      }, { status: 503 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Klinq CRM <${FROM_EMAIL}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || `<p>${text}</p>`,
        text: text || '',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Email send failed' }, { status: res.status })
    }

    // Log to Supabase — both emails table and interactions
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    const serviceClient = createServiceClient()

    if (user) {
      // Log to emails table
      await (serviceClient as any).from('emails').insert({
        user_id: user.id,
        lead_id: leadId || null,
        contact_id: contactId || null,
        to_email: Array.isArray(to) ? to[0] : to,
        subject,
        body: html || text || '',
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_id: data.id || null,
        created_at: new Date().toISOString(),
      })

      // Log to interactions timeline if linked to a lead
      if (leadId) {
        await (serviceClient as any).from('interactions').insert({
          user_id: user.id,
          lead_id: leadId,
          type: 'email',
          direction: 'outbound',
          content_raw: subject,
          ai_summary: `Email sent: ${subject}`,
          created_at: new Date().toISOString(),
        })
        await serviceClient.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', leadId)
      }
      // Audit log
      await logAudit({
        req, supabase: serviceClient,
        companyId: '',
        userId: user.id, userEmail: user.email || '',
        action: 'email.sent',
        entityType: 'email', entityId: data.id || '',
        newValue: { to, subject, resend_id: data.id },
      })
    }

    return NextResponse.json({ success: true, id: data.id, recipients: to })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
