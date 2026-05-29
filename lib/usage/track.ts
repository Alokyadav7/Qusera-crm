// ─── Klinq CRM — Usage Tracking ────────────────────────────────────────────────
// Track metered usage events (API calls, AI tokens, WhatsApp, SMS, etc.)
// Call from API routes after successful operations.

import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/lib/supabase/database.types'
import type { UsageMetric } from '@/lib/types/tenant'

/**
 * Track a usage event for billing and rate limiting.
 * Non-blocking — never throws to caller.
 */
export async function trackUsage(
  companyId: string,
  metric: UsageMetric,
  quantity: number = 1,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('usage_events').insert({
      company_id: companyId,
      metric_key: metric,
      quantity,
      metadata: (metadata ?? {}) as Json,
    })
    if (error) {
      console.error('[trackUsage] Failed:', error.message)
    }
  } catch (err) {
    console.error('[trackUsage] Unexpected error:', err)
  }
}

/**
 * Get monthly usage for a company.
 * Returns a map of metric_key → total_quantity for the current calendar month.
 */
export async function getMonthlyUsage(companyId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('usage_events')
    .select('metric_key, quantity')
    .eq('company_id', companyId)
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)

  if (error || !data) return {}

  const totals: Record<string, number> = {}
  for (const row of data) {
    totals[row.metric_key] = (totals[row.metric_key] ?? 0) + (row.quantity ?? 1)
  }
  return totals
}
