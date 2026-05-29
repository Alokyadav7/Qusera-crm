import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Email Inbound Webhook
 * POST /api/webhooks/email
 *
 * Supports:
 * - Resend Inbound (when available)
 * - SendGrid Inbound Parse (multipart/form-data)
 * - Generic JSON payload
 *
 * Matches sender to contacts/leads by email address.
 * Logs to emails table + interactions timeline + notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let fromEmail = ''
    let subject = ''
    let body = ''
    let toEmail = ''

    if (contentType.includes('application/json')) {
      // Resend inbound format
      const json = await req.json()
      fromEmail = json.from || json.sender || ''
      subject = json.subject || ''
      body = json.html || json.text || json.body || ''
      toEmail = json.to || ''
    } else if (contentType.includes('multipart/form-data')) {
      // SendGrid Inbound Parse format
      const formData = await req.formData()
      fromEmail = formData.get('from')?.toString() || ''
      subject = formData.get('subject')?.toString() || ''
      body = formData.get('html')?.toString() || formData.get('text')?.toString() || ''
      toEmail = formData.get('to')?.toString() || ''
    } else {
      // Fallback: treat as JSON
      try {
        const json = await req.json()
        fromEmail = json.from || ''
        subject = json.subject || ''
        body = json.text || json.html || ''
        toEmail = json.to || ''
      } catch {
        return NextResponse.json({ error: 'Unrecognized payload format' }, { status: 400 })
      }
    }

    // Extract clean email from "Name <email>" format
    const emailMatch = fromEmail.match(/<(.+?)>/) || [null, fromEmail.trim()]
    const senderEmail = emailMatch[1]?.toLowerCase() || fromEmail.toLowerCase()

    if (!senderEmail || !subject) {
      return NextResponse.json({ error: 'Missing from or subject' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get default company
    const { data: companies } = await (supabase as any).from('companies').select('id').limit(1)
    const defaultCompanyId = companies?.[0]?.id || null

    // ── Match sender to existing lead/contact by email ───────────────────────
    let leadId: string | null = null
    let leadUserId: string | null = null
    let companyId: string | null = defaultCompanyId

    const { data: lead } = await (supabase as any)
      .from('leads')
      .select('id, user_id, company_id')
      .ilike('email', senderEmail)
      .maybeSingle()

    if (lead) {
      leadId = lead.id
      leadUserId = lead.user_id
      companyId = lead.company_id || defaultCompanyId
    } else {
      // Create new lead from inbound email
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
            full_name: fromEmail.split('<')[0].trim() || senderEmail,
            email: senderEmail,
            status: 'new',
            source: 'email_inbound',
            buying_intent: 'medium',
            sentiment_score: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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

    // ── Log to emails table ──────────────────────────────────────────────────
    await (supabase as any).from('emails').insert({
      user_id: leadUserId,
      company_id: companyId,
      lead_id: leadId,
      from_email: senderEmail,
      to_email: toEmail,
      subject,
      body: body.substring(0, 5000), // Truncate very long bodies
      direction: 'inbound',
      status: 'received',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    // ── Log to interactions timeline ─────────────────────────────────────────
    if (leadId && leadUserId) {
      await (supabase as any).from('interactions').insert({
        user_id: leadUserId,
        company_id: companyId,
        lead_id: leadId,
        type: 'email',
        direction: 'inbound',
        content_raw: subject,
        ai_summary: `Email received: ${subject}`,
        created_at: new Date().toISOString(),
      })

      // Update lead last contact
      await (supabase as any).from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', leadId)

      // ── Notify assigned rep ──────────────────────────────────────────────
      await (supabase as any).from('notifications').insert({
        company_id: companyId,
        user_id: leadUserId,
        title: `New email: ${subject}`,
        body: `From: ${senderEmail}`,
        entity_type: 'lead',
        entity_id: leadId,
        read: false,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Some services verify the endpoint first
export async function GET() {
  return NextResponse.json({ status: 'Email webhook active' })
}
