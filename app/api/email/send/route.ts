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
    // Auth check — must be authenticated before sending any email
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, subject, html, text, leadId, contactId } = await req.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html/text' }, { status: 400 })
    }

    const { sendEmail } = require('@/lib/email')
    const sendResult = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || `<p>${text}</p>`,
    })

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || 'Email send failed' }, { status: 500 })
    }

    const data = { id: sendResult.messageId }

    // Log to Supabase — both emails table and interactions
    const serviceClient = createServiceClient()

    // Get company_id from user's active company
    const { data: uac } = await (serviceClient as any)
      .from('user_active_company')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    const companyId: string | null = uac?.company_id ?? null

    // Log to emails table
    await (serviceClient as any).from('emails').insert({
      user_id: user.id,
      company_id: companyId,
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
        company_id: companyId,
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
      companyId: companyId || '',
      userId: user.id, userEmail: user.email || '',
      action: 'email.sent',
      entityType: 'email', entityId: data.id || '',
      newValue: { to, subject, resend_id: data.id },
    })

    return NextResponse.json({ success: true, id: data.id, recipients: to })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
