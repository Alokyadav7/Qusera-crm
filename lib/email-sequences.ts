import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'

/**
 * Background sequence processor.
 * Scans active enrollments due to receive emails and delivers them.
 */
export async function processActiveSequences(): Promise<{ processed: number; errors: any[] }> {
  const supabase = createServiceClient()
  const nowStr = new Date().toISOString()
  const errors: any[] = []

  // 1. Fetch active enrollments whose next_send_at is due
  const { data: enrollments, error: enrollErr } = await (supabase as any)
    .from('email_sequence_enrollments')
    .select(`
      id, company_id, sequence_id, current_step, status, next_send_at, lead_id,
      lead:leads(full_name, email),
      sequence:email_sequences(name, is_active)
    `)
    .eq('status', 'active')
    .lte('next_send_at', nowStr)

  if (enrollErr) {
    console.error('[Sequence Processor] Error loading due enrollments:', enrollErr.message)
    return { processed: 0, errors: [enrollErr] }
  }

  if (!enrollments || enrollments.length === 0) {
    return { processed: 0, errors: [] }
  }

  let processedCount = 0

  for (const en of enrollments) {
    try {
      // If parent sequence is paused, skip it
      if (!en.sequence?.is_active) continue

      const targetEmail = en.lead?.email
      const targetName = en.lead?.full_name ?? 'there'

      if (!targetEmail) {
        // No email - complete or mark failed
        await (supabase as any)
          .from('email_sequence_enrollments')
          .update({ status: 'completed', completed_at: nowStr })
          .eq('id', en.id)
        continue
      }

      // 2. Load matching sequence step
      const { data: step, error: stepErr } = await (supabase as any)
        .from('email_sequence_steps')
        .select('*')
        .eq('sequence_id', en.sequence_id)
        .eq('step_number', en.current_step)
        .single()

      if (stepErr || !step) {
        // Step not found - sequence completed
        await (supabase as any)
          .from('email_sequence_enrollments')
          .update({ status: 'completed', completed_at: nowStr })
          .eq('id', en.id)
        continue
      }

      // Replace simple template variables in email HTML
      const personalizedBody = step.body_html
        .replace(/{{name}}/g, targetName)
        .replace(/{{email}}/g, targetEmail)

      // 3. Send email via Gmail SMTP
      const mailRes = await sendEmail({
        to: targetEmail,
        subject: step.subject,
        html: personalizedBody,
      })

      if (!mailRes.success) {
        throw new Error(`Email delivery failed: ${mailRes.error}`)
      }

      // 4. Look ahead for next step
      const nextStepNum = en.current_step + 1
      const { data: nextStep } = await (supabase as any)
        .from('email_sequence_steps')
        .select('delay_hours')
        .eq('sequence_id', en.sequence_id)
        .eq('step_number', nextStepNum)
        .maybeSingle()

      if (nextStep) {
        // Update enrollment to next step and set delay
        const delayHours = nextStep.delay_hours ?? 24
        const nextSendDate = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString()

        await (supabase as any)
          .from('email_sequence_enrollments')
          .update({
            current_step: nextStepNum,
            next_send_at: nextSendDate,
            updated_at: nowStr,
          })
          .eq('id', en.id)
      } else {
        // No further steps — successfully completed sequence!
        await (supabase as any)
          .from('email_sequence_enrollments')
          .update({
            status: 'completed',
            completed_at: nowStr,
            updated_at: nowStr,
          })
          .eq('id', en.id)
      }

      processedCount++
    } catch (err: any) {
      console.error(`[Sequence Processor] Error processing enrollment ${en.id}:`, err.message)
      errors.push({ enrollment_id: en.id, error: err.message })
    }
  }

  return { processed: processedCount, errors }
}
