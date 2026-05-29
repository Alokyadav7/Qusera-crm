// ─── Klinq CRM — Tenant TypeScript Types ───────────────────────────────────────
// All multi-tenant data structures

export type CompanyStatus = 'trial' | 'active' | 'suspended' | 'canceled' | 'deleted'
export type MemberRole = 'owner' | 'admin' | 'manager' | 'sales' | 'support' | 'marketing' | 'viewer'
export type WorkspaceType = 'sales' | 'support' | 'marketing' | 'custom'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'
export type BillingCycle = 'monthly' | 'yearly'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed' | 'canceled'
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'void' | 'refunded'

// ── Company ──────────────────────────────────────────────────
export interface Company {
  id: string
  name: string
  slug: string
  owner_id: string | null
  status: CompanyStatus
  logo_url: string | null
  primary_color: string
  custom_domain: string | null
  timezone: string
  currency: string
  onboarding_step: number
  onboarding_completed_at: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
  // joined
  subscription?: Subscription
  member_count?: number
}

// ── Workspace ────────────────────────────────────────────────
export interface Workspace {
  id: string
  company_id: string
  name: string
  slug: string
  type: WorkspaceType
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ── Company Member ────────────────────────────────────────────
export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: MemberRole
  workspace_ids: string[]
  is_active: boolean
  invited_by: string | null
  invited_at: string | null
  joined_at: string
  last_active_at: string | null
  deleted_at: string | null
  // joined
  user?: MemberUser
}

export interface MemberUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  last_sign_in_at: string | null
}

// ── Invite ────────────────────────────────────────────────────
export interface Invite {
  id: string
  company_id: string
  workspace_id: string | null
  email: string
  role: Exclude<MemberRole, 'owner'>
  token: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  invited_by: string | null
  created_at: string
  // joined
  company?: Pick<Company, 'id' | 'name' | 'logo_url' | 'primary_color'>
}

// ── User Active Company ──────────────────────────────────────
export interface UserActiveCompany {
  user_id: string
  company_id: string
  workspace_id: string | null
  updated_at: string
}

// ── Plans & Billing ──────────────────────────────────────────
export interface Plan {
  id: string
  name: string
  display_name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  is_active: boolean
  sort_order: number
}

export interface PlanLimit {
  id: string
  plan_id: string
  feature_key: string
  limit_value: number  // -1 = unlimited
}

export interface Subscription {
  id: string
  company_id: string
  plan_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  mrr: number
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  razorpay_subscription_id: string | null
  canceled_at: string | null
  created_at: string
  updated_at: string
  // joined
  plan?: Plan
}

export interface Invoice {
  id: string
  company_id: string
  subscription_id: string | null
  amount: number
  currency: string
  status: InvoiceStatus
  razorpay_payment_id: string | null
  invoice_url: string | null
  period_start: string | null
  period_end: string | null
  paid_at: string | null
  created_at: string
}

// ── Feature Flags ────────────────────────────────────────────
export interface FeatureDefinition {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  default_enabled: boolean
  is_beta: boolean
}

export interface CompanyFeatureOverride {
  id: string
  company_id: string
  feature_key: string
  is_enabled: boolean
  reason: string | null
  enabled_by: string | null
  expires_at: string | null
  created_at: string
}

// ── Activity Events ──────────────────────────────────────────
export interface ActivityEvent {
  id: string
  company_id: string | null
  workspace_id: string | null
  actor_id: string | null
  actor_type: 'user' | 'system' | 'automation' | 'super_admin'
  event_type: string
  resource_type: string | null
  resource_id: string | null
  resource_label: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

// ── Usage ────────────────────────────────────────────────────
export type UsageMetric =
  | 'api_call'
  | 'ai_token'
  | 'whatsapp_message'
  | 'sms_sent'
  | 'email_sent'
  | 'storage_byte'
  | 'automation_run'
  | 'export_run'

export interface UsageSummary {
  id: string
  company_id: string
  period_start: string
  period_end: string
  period_type: 'day' | 'month'
  metric_key: UsageMetric
  total_quantity: number
  updated_at: string
}

// ── Job Queue ────────────────────────────────────────────────
export type JobType =
  | 'send_email'
  | 'send_whatsapp'
  | 'send_sms'
  | 'ai_process'
  | 'ai_score_lead'
  | 'generate_report'
  | 'export_data'
  | 'run_automation'
  | 'import_leads'
  | 'send_bulk_sms'
  | 'send_bulk_whatsapp'

export interface QueuedJob {
  id: string
  company_id: string | null
  job_type: JobType
  payload: Record<string, unknown>
  status: JobStatus
  priority: number
  attempts: number
  max_attempts: number
  last_error: string | null
  result: Record<string, unknown> | null
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  created_by: string | null
}

// ── Impersonation ────────────────────────────────────────────
export interface ImpersonationSession {
  id: string
  super_admin_id: string
  target_company_id: string
  target_user_id: string | null
  reason: string
  actions_taken: Record<string, unknown>[]
  ip_address: string | null
  started_at: string
  ended_at: string | null
}

// ── Tenant Context (injected by middleware) ──────────────────
export interface TenantContext {
  userId: string
  companyId: string
  workspaceId: string | null
  role: MemberRole
  planId: string
  isImpersonating: boolean
  impersonationSessionId: string | null
}

// ── Platform Admin ───────────────────────────────────────────
export interface PlatformAdmin {
  user_id: string
  granted_by: string | null
  granted_at: string
  is_active: boolean
  notes: string | null
}

// ── Super Admin Company View ──────────────────────────────────
export interface CompanyWithStats extends Company {
  subscription?: Subscription & { plan?: Plan }
  member_count: number
  lead_count: number
  mrr: number
}
