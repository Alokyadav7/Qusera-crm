// ─── Klinq CRM — Job Queue ────────────────────────────────────────────────────
// Provider-agnostic job queue abstraction backed by Supabase job_queue table.
// Future: swap implementation for Inngest/BullMQ without changing call sites.

import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/lib/supabase/database.types'
import type { JobType, QueuedJob } from '@/lib/types/tenant'

export interface EnqueueJobInput {
  companyId?: string | null
  type: JobType
  payload: Record<string, unknown>
  priority?: number       // 1 (lowest) to 10 (highest), default 5
  scheduledAt?: Date
  maxAttempts?: number
  createdBy?: string
}

/**
 * Enqueue a background job.
 * Returns the job ID.
 *
 * @example
 * const jobId = await enqueueJob({
 *   companyId: ctx.companyId,
 *   type: 'send_email',
 *   payload: { to: 'user@example.com', template: 'invite', data: { ... } },
 * })
 */
export async function enqueueJob(input: EnqueueJobInput): Promise<string> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('job_queue')
    .insert({
      company_id: input.companyId ?? null,
      job_type: input.type,
      payload: input.payload as Json,

      priority: input.priority ?? 5,
      max_attempts: input.maxAttempts ?? 3,
      scheduled_at: input.scheduledAt?.toISOString() ?? new Date().toISOString(),
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to enqueue job: ${error?.message}`)
  }

  return data.id
}

/**
 * Claim a batch of pending jobs for processing (atomic, prevents double-processing).
 * Called by the worker endpoint.
 */
export async function claimPendingJobs(batchSize: number = 10): Promise<QueuedJob[]> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Atomically mark jobs as 'processing' and return them
  // Note: Supabase doesn't support subqueries in filters — filter attempts < max_attempts
  // by selecting only jobs where attempts < 10 (safe upper bound, real max enforced in DB)
  const { data, error } = await supabase
    .from('job_queue')
    .update({ status: 'processing', started_at: now })
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .lt('attempts', 10)
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .limit(batchSize)
    .select()

  if (error) {
    console.error('[claimPendingJobs] Error:', error.message)
    return []
  }

  return (data ?? []) as QueuedJob[]
}

/**
 * Mark a job as done with an optional result.
 */
export async function markJobDone(
  jobId: string,
  result?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('job_queue')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      result: (result ?? null) as Json | null,

    })
    .eq('id', jobId)
}

/**
 * Mark a job as failed (increments attempts, sets error, resets to pending if retryable).
 */
export async function markJobFailed(
  jobId: string,
  error: string,
  retryDelaySeconds: number = 60
): Promise<void> {
  const supabase = createServiceClient()

  // Get current attempts
  const { data: job } = await supabase
    .from('job_queue')
    .select('attempts, max_attempts')
    .eq('id', jobId)
    .single()

  if (!job) return

  const nextAttempts = (job.attempts ?? 0) + 1
  const exhausted = nextAttempts >= (job.max_attempts ?? 3)

  const nextSchedule = new Date()
  nextSchedule.setSeconds(nextSchedule.getSeconds() + retryDelaySeconds * nextAttempts)

  await supabase
    .from('job_queue')
    .update({
      status: exhausted ? 'failed' : 'pending',
      attempts: nextAttempts,
      last_error: error,
      started_at: null,
      ...(exhausted ? {} : { scheduled_at: nextSchedule.toISOString() }),
    })
    .eq('id', jobId)
}
