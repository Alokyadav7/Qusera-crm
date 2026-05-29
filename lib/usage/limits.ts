// ─── Klinq CRM — Plan Limits Checker ──────────────────────────────────────────
// Check if a company is within its plan limits before allowing operations.
// Use at the API layer before inserts.

import { createServiceClient } from '@/lib/supabase/service'
import { getMonthlyUsage } from './track'

export interface LimitCheckResult {
  allowed: boolean
  used: number
  limit: number   // -1 = unlimited
  message?: string
}

/**
 * Check if a company can perform an action based on plan limits.
 *
 * @example
 * const check = await checkLimit(companyId, 'max_users')
 * if (!check.allowed) return Response.json({ error: check.message }, { status: 402 })
 */
export async function checkLimit(
  companyId: string,
  featureKey: string,
  currentCount?: number
): Promise<LimitCheckResult> {
  const supabase = createServiceClient()

  // Step 1: Get the company's active subscription plan
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('company_id', companyId)
    .maybeSingle()

  if (!subData) {
    return { allowed: false, used: 0, limit: 0, message: 'No active subscription found.' }
  }

  // Step 2: Get the plan limit for this feature
  const { data: planLimit } = await supabase
    .from('plan_limits')
    .select('limit_value')
    .eq('plan_id', subData.plan_id)
    .eq('feature_key', featureKey)
    .maybeSingle()

  const limit = planLimit?.limit_value ?? 0

  // Unlimited
  if (limit === -1) {
    return { allowed: true, used: currentCount ?? 0, limit: -1 }
  }

  // For count-based limits (max_users, max_leads, max_pipelines)
  if (currentCount !== undefined) {
    const allowed = currentCount < limit
    return {
      allowed,
      used: currentCount,
      limit,
      message: allowed ? undefined : `Plan limit reached: ${featureKey} (${currentCount}/${limit}). Upgrade to continue.`,
    }
  }

  // For usage-based limits (ai_credits, whatsapp_messages, sms_credits)
  const usage = await getMonthlyUsage(companyId)
  const metricMap: Record<string, string> = {
    ai_credits: 'ai_token',
    whatsapp_messages: 'whatsapp_message',
    sms_credits: 'sms_sent',
  }
  const metric = metricMap[featureKey]
  const used = metric ? (usage[metric] ?? 0) : 0
  const allowed = used < limit

  return {
    allowed,
    used,
    limit,
    message: allowed ? undefined : `Monthly ${featureKey} limit reached (${used}/${limit}). Upgrade to continue.`,
  }
}

/**
 * Check if a feature is enabled for a company.
 * Uses Supabase's check_feature() SQL function.
 */
export async function isFeatureEnabled(
  companyId: string,
  featureKey: string
): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .rpc('check_feature', { p_company_id: companyId, p_feature_key: featureKey })
  if (error) {
    console.error('[isFeatureEnabled] Error:', error.message)
    return false
  }
  return data === true
}
