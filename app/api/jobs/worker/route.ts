import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { claimPendingJobs, markJobDone, markJobFailed } from '@/lib/jobs/enqueue'
import type { QueuedJob } from '@/lib/types/tenant'
import { sendEmail, teamInviteEmailHtml, welcomeEmailHtml } from '@/lib/email'
import { processActiveSequences } from '@/lib/email-sequences'

// POST /api/jobs/worker
// Called by Supabase pg_cron every minute (or Vercel cron)
// Processes pending jobs from the job_queue table

const WORKER_SECRET = process.env.WORKER_SECRET ?? 'dev-worker-secret'

export async function POST(req: NextRequest) {
  // Validate worker secret to prevent unauthorized execution
  const auth = req.headers.get('x-worker-secret')
  if (auth !== WORKER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Run active drip sequence engine processor on every check
  const seqResult = await processActiveSequences().catch(err => {
    console.error('[Worker] Active sequences drip execution failed:', err)
    return { processed: 0, errors: [err] }
  })

  const jobs = await claimPendingJobs(10)

  if (jobs.length === 0) {
    return NextResponse.json({
      processed: 0,
      sequencesProcessed: seqResult.processed,
      sequenceErrors: seqResult.errors.length,
      message: 'No pending queue jobs'
    })
  }

  const results: { id: string; type: string; status: 'done' | 'failed'; error?: string }[] = []

  for (const job of jobs) {
    try {
      await processJob(job)
      await markJobDone(job.id)
      results.push({ id: job.id, type: job.job_type, status: 'done' })
    } catch (err: any) {
      const errorMsg = err?.message ?? 'Unknown error'
      await markJobFailed(job.id, errorMsg)
      results.push({ id: job.id, type: job.job_type, status: 'failed', error: errorMsg })
    }
  }

  return NextResponse.json({ processed: jobs.length, results })
}

async function processJob(job: QueuedJob): Promise<void> {
  switch (job.job_type) {
    case 'send_email':
      await handleSendEmail(job)
      break
    case 'send_whatsapp':
      await handleSendWhatsApp(job)
      break
    case 'send_sms':
      await handleSendSMS(job)
      break
    case 'ai_score_lead':
      await handleScoreLead(job)
      break
    case 'send_bulk_sms':
    case 'send_bulk_whatsapp':
    case 'generate_report':
    case 'export_data':
    case 'import_leads':
    case 'run_automation':
    case 'ai_process':
      console.log(`[Worker] Job type '${job.job_type}' handler not yet implemented. Marking done.`)
      break
    default:
      throw new Error(`Unknown job type: ${job.job_type}`)
  }
}

async function handleSendEmail(job: QueuedJob): Promise<void> {
  const { to, template, data } = job.payload as {
    to: string
    template: string
    data: Record<string, unknown>
  }

  let subject = 'Notification from Klinq CRM'
  let html = ''

  if (template === 'team_invite') {
    subject = `You've been invited to join ${data.companyName} on Klinq CRM`
    html = teamInviteEmailHtml({
      companyName: String(data.companyName ?? 'Klinq CRM'),
      inviterName: String(data.inviterName ?? 'Your admin'),
      role: String(data.role ?? 'member'),
      inviteUrl: String(data.inviteUrl ?? ''),
      expiryDays: Number(data.expiresInDays ?? 7),
    })
  } else if (template === 'welcome') {
    subject = `Welcome to Klinq CRM!`
    html = welcomeEmailHtml({
      userName: String(data.userName ?? 'User'),
      companyName: String(data.companyName ?? 'Klinq CRM'),
    })
  } else {
    // Generic fallback
    subject = String(data.subject ?? subject)
    html = String(data.html ?? `<p>${String(data.body ?? 'You have a new notification from Klinq CRM.')}</p>`)
  }

  const result = await sendEmail({ to, subject, html })
  if (!result.success) {
    throw new Error(`Email send failed: ${result.error}`)
  }
}

async function handleSendWhatsApp(job: QueuedJob): Promise<void> {
  // Delegate to existing WhatsApp API logic
  console.log('[Worker] WhatsApp job:', job.id)
  // Implementation: call Meta WhatsApp API with job.payload
}

async function handleSendSMS(job: QueuedJob): Promise<void> {
  console.log('[Worker] SMS job:', job.id)
  // Implementation: call Fast2SMS with job.payload
}

async function handleScoreLead(job: QueuedJob): Promise<void> {
  const { leadId, companyId } = job.payload as { leadId: string; companyId: string }
  const svc = createServiceClient()

  const { data: lead } = await svc.from('leads').select('*').eq('id', leadId).single()
  if (!lead) throw new Error(`Lead ${leadId} not found`)

  // Simple heuristic scoring (replace with AI call in production)
  let score = 50
  if (lead.deal_value && lead.deal_value > 100000) score += 20
  if (lead.buying_intent === 'high') score += 15
  if (lead.last_contacted_at) score += 10
  if (lead.status === 'negotiation') score += 15

  await svc.from('leads').update({
    sentiment_score: Math.min(score, 100),
    updated_at: new Date().toISOString(),
  }).eq('id', leadId)
}
