import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/cron/daily
 * Runs daily at 9am IST via Supabase Edge Function cron.
 * Tasks:
 *   1. Mark overdue invoices
 *   2. Send task due-soon notifications  
 *   3. Decay lead scores for inactive leads (no activity 7+ days)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const results: Record<string, number> = {}

  // ── 1. Mark overdue invoices ──────────────────────────────────────────────
  const { count: overdueCount } = await (supabase as any)
    .from('crm_invoices')
    .update({ status: 'overdue' })
    .eq('status', 'sent')
    .lt('due_date', today)
    .select('id', { count: 'exact', head: true })
  results.invoices_marked_overdue = overdueCount ?? 0

  // ── 2. Task due-soon notifications (due within 24h) ───────────────────────
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString()
  const { data: dueTasks } = await (supabase as any)
    .from('tasks')
    .select('id, title, assigned_to, company_id, due_date')
    .eq('status', 'pending')
    .lte('due_date', tomorrow)
    .gte('due_date', now.toISOString())
    .limit(200)

  if (dueTasks?.length) {
    const notifs = (dueTasks as any[]).map(t => ({
      company_id: t.company_id,
      user_id: t.assigned_to,
      title: `Task due soon: ${t.title}`,
      body: `Due ${new Date(t.due_date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`,
      entity_type: 'task',
      entity_id: t.id,
      read: false,
      created_at: now.toISOString(),
    })).filter(n => n.user_id)

    if (notifs.length) {
      await (supabase as any).from('notifications').insert(notifs)
    }
    results.task_notifications_sent = notifs.length
  }

  // ── 3. Lead score decay ───────────────────────────────────────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
  const { data: staleLeads } = await (supabase as any)
    .from('leads')
    .select('id, sentiment_score')
    .lt('last_contacted_at', sevenDaysAgo)
    .gt('sentiment_score', 0)
    .not('status', 'in', '("won","lost","closed_lost")')
    .limit(500)

  if (staleLeads?.length) {
    for (const lead of staleLeads as any[]) {
      const decayed = Math.max(0, (lead.sentiment_score ?? 50) - 5)
      await (supabase as any).from('leads').update({ sentiment_score: decayed }).eq('id', lead.id)
    }
    results.leads_score_decayed = staleLeads.length
  }

  // Log job
  await (supabase as any).from('audit_logs').insert({
    action: 'cron.daily.run',
    entity_type: 'system',
    entity_id: 'daily-cron',
    new_value: { ...results, run_at: now.toISOString() },
    created_at: now.toISOString(),
  })

  return NextResponse.json({ success: true, results })
}

export async function GET(req: NextRequest) { return POST(req) }
