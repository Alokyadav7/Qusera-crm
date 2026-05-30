/**
 * lib/company-health.ts
 * Computes a deterministic health score (0–100) for a company tenant.
 * Used by /api/super-admin/companies/[id]/health and the companies table.
 */

export interface HealthInput {
  daysSinceLastLogin: number     // days since any user in the company last logged in
  onboardingComplete: boolean    // companies.setup_complete
  activeUsersLast30Days: number  // company_members with last_login_at > 30d
  totalUsers: number             // total active company_members
  failedIntegrations: number     // company_integrations with status = 'error'
  hasLeadsThisMonth: boolean     // at least 1 lead created this month
  planStatus: string             // 'active' | 'trial' | 'suspended'
}

export interface HealthResult {
  score: number
  status: 'healthy' | 'warning' | 'critical'
  reasons: string[]
}

export function computeHealthScore(data: HealthInput): HealthResult {
  let score = 100
  const reasons: string[] = []

  // Login recency — most important signal
  if (data.daysSinceLastLogin > 14) {
    score -= 30
    reasons.push(`No logins in ${data.daysSinceLastLogin} days`)
  } else if (data.daysSinceLastLogin > 7) {
    score -= 20
    reasons.push(`No logins in ${data.daysSinceLastLogin} days`)
  }

  // Onboarding completion
  if (!data.onboardingComplete) {
    score -= 25
    reasons.push('Onboarding incomplete')
  }

  // User engagement
  if (data.totalUsers > 0 && data.activeUsersLast30Days === 0) {
    score -= 20
    reasons.push('No active users in last 30 days')
  } else if (
    data.totalUsers > 0 &&
    data.activeUsersLast30Days / data.totalUsers < 0.3
  ) {
    score -= 15
    reasons.push('Low user engagement (< 30% active)')
  }

  // Integration health
  if (data.failedIntegrations > 0) {
    score -= 20
    reasons.push(
      `${data.failedIntegrations} integration${data.failedIntegrations > 1 ? 's' : ''} failing`
    )
  }

  // Lead activity
  if (!data.hasLeadsThisMonth) {
    score -= 10
    reasons.push('No leads created this month')
  }

  // Suspension is an immediate critical
  if (data.planStatus === 'suspended') {
    score -= 40
    reasons.push('Account suspended')
  }

  // Clamp to [0, 100]
  score = Math.max(0, Math.min(100, score))

  let status: HealthResult['status']
  if (score >= 70) status = 'healthy'
  else if (score >= 40) status = 'warning'
  else status = 'critical'

  return { score, status, reasons }
}
