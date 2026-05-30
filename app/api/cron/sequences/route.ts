import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/cron/sequences
 * Called hourly by Supabase Edge Function cron or external scheduler.
 * Guarded by CRON_SECRET header.
 *
 * Process: find active enrollments where next_send_at <= NOW()
 * → send email via Resend → advance step or mark completed.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()
  let sent = 0
  let errors = 0

  try {
    // Find all due enrollments
    const { data: enrollments, error: fetchErr } = await (supabase as any)
      .from('sequence_enrollments')
      .select(`
        id, sequence_id, lead_id, contact_id, company_id, current_step,
        lead:leads(full_name, email),
        contact:contacts(full_name, email),
        sequence:sequences(name, is_active)
      `)
      .eq('status', 'active')
      .lte('next_send_at', now)
      .limit(100)

    if (fetchErr) throw fetchErr

    // Using Gmail SMTP sendEmail helper (Resend not installed)

    for (const enrollment of (enrollments as any[]) ?? []) {
      try {
        if (!(enrollment.sequence as any)?.is_active) {
          await (supabase as any).from('sequence_enrollments').update({ status: 'paused' }).eq('id', enrollment.id)
          continue
        }

        // Get current step
        const { data: step } = await (supabase as any)
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', enrollment.sequence_id)
          .eq('step_number', enrollment.current_step)
          .single()

        if (!step) {
          // No more steps — complete
          await (supabase as any).from('sequence_enrollments')
            .update({ status: 'completed', completed_at: now })
            .eq('id', enrollment.id)
          continue
        }

        const recipient = enrollment.lead || enrollment.contact
        const toEmail = (recipient as any)?.email
        const toName = (recipient as any)?.full_name || 'there'

        if (!toEmail) {
          await (supabase as any).from('sequence_enrollments')
            .update({ status: 'completed' }).eq('id', enrollment.id)
          continue
        }

        // Build unsubscribe token
        const unsubToken = Buffer.from(`${enrollment.id}:unsub`).toString('base64url')
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://klinqcrm.in'
        const unsubLink = `${appUrl}/api/sequences/unsubscribe?token=${unsubToken}`

        // Send email
        const html = (step as any).body_html
          .replace(/\{\{name\}\}/gi, toName)
          .replace(/\{\{unsubscribe_link\}\}/gi, unsubLink)
          + `<p style="font-size:11px;color:#999;margin-top:24px">
              <a href="${unsubLink}" style="color:#999">Unsubscribe</a>
             </p>`

        await sendEmail({
          to: toEmail,
          subject: (step as any).subject.replace(/\{\{name\}\}/gi, toName),
          html,
        })

        // Get next step
        const { data: nextStep } = await (supabase as any)
          .from('sequence_steps')
          .select('step_number, delay_days')
          .eq('sequence_id', enrollment.sequence_id)
          .eq('step_number', enrollment.current_step + 1)
          .single()

        if (nextStep) {
          const nextSend = new Date()
          nextSend.setDate(nextSend.getDate() + (nextStep as any).delay_days)
          await (supabase as any).from('sequence_enrollments').update({
            current_step: enrollment.current_step + 1,
            next_send_at: nextSend.toISOString(),
          }).eq('id', enrollment.id)
        } else {
          // Last step sent — complete
          await (supabase as any).from('sequence_enrollments')
            .update({ status: 'completed', completed_at: now }).eq('id', enrollment.id)
        }

        sent++
      } catch {
        errors++
      }
    }

    // Log job run
    await (supabase as any).from('audit_logs').insert({
      action: 'cron.sequences.run',
      entity_type: 'system',
      entity_id: 'sequences-cron',
      new_value: { sent, errors, run_at: now },
      created_at: now,
    })

    return NextResponse.json({ success: true, sent, errors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'CRON_FAILED' }, { status: 500 })
  }
}

// GET for Supabase Edge Function schedule compatibility
export async function GET(req: NextRequest) {
  return POST(req)
}
