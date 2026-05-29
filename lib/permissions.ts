/**
 * lib/permissions.ts
 * Single source of truth for RBAC — used by API routes + UI.
 * Never trust UI-only guards; every API route must call checkPermission().
 */
import { createServiceClient } from '@/lib/supabase/service'

// ── Roles ─────────────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:   'super_admin',
  COMPANY_ADMIN: 'company_admin',
  SALES_MANAGER: 'sales_manager',
  SALES_REP:     'sales_rep',
  VIEWER:        'viewer',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// ── Actions ───────────────────────────────────────────────────────────────────
export type Action =
  | 'leads.view_all'
  | 'leads.view_own'
  | 'leads.create'
  | 'leads.edit'
  | 'leads.delete'
  | 'deals.view_all'
  | 'deals.view_own'
  | 'deals.create'
  | 'deals.edit'
  | 'deals.delete'
  | 'contacts.view'
  | 'contacts.create'
  | 'contacts.edit'
  | 'contacts.delete'
  | 'sms.send'
  | 'whatsapp.send'
  | 'email.send'
  | 'reports.view'
  | 'automations.manage'
  | 'team.manage'
  | 'audit_logs.view'
  | 'invoices.create'
  | 'invoices.view'
  | 'invoices.delete'
  | 'sequences.manage'
  | 'goals.manage'
  | 'documents.upload'
  | 'documents.delete'
  | 'super_admin.access'
  | 'settings.manage'

// ── Permission Matrix ─────────────────────────────────────────────────────────
// super_admin always passes — checked first before matrix lookup
const MATRIX: Record<Action, Role[]> = {
  'leads.view_all':       ['company_admin', 'sales_manager'],
  'leads.view_own':       ['company_admin', 'sales_manager', 'sales_rep', 'viewer'],
  'leads.create':         ['company_admin', 'sales_manager', 'sales_rep'],
  'leads.edit':           ['company_admin', 'sales_manager', 'sales_rep'],
  'leads.delete':         ['company_admin', 'sales_manager'],
  'deals.view_all':       ['company_admin', 'sales_manager', 'viewer'],
  'deals.view_own':       ['company_admin', 'sales_manager', 'sales_rep', 'viewer'],
  'deals.create':         ['company_admin', 'sales_manager', 'sales_rep'],
  'deals.edit':           ['company_admin', 'sales_manager', 'sales_rep'],
  'deals.delete':         ['company_admin'],
  'contacts.view':        ['company_admin', 'sales_manager', 'sales_rep', 'viewer'],
  'contacts.create':      ['company_admin', 'sales_manager', 'sales_rep'],
  'contacts.edit':        ['company_admin', 'sales_manager', 'sales_rep'],
  'contacts.delete':      ['company_admin', 'sales_manager'],
  'sms.send':             ['company_admin', 'sales_manager'],
  'whatsapp.send':        ['company_admin', 'sales_manager'],
  'email.send':           ['company_admin', 'sales_manager', 'sales_rep'],
  'reports.view':         ['company_admin', 'sales_manager', 'viewer'],
  'automations.manage':   ['company_admin', 'sales_manager'],
  'team.manage':          ['company_admin'],
  'audit_logs.view':      ['company_admin', 'sales_manager'],
  'invoices.create':      ['company_admin', 'sales_manager', 'sales_rep'],
  'invoices.view':        ['company_admin', 'sales_manager', 'sales_rep', 'viewer'],
  'invoices.delete':      ['company_admin'],
  'sequences.manage':     ['company_admin', 'sales_manager'],
  'goals.manage':         ['company_admin'],
  'documents.upload':     ['company_admin', 'sales_manager', 'sales_rep'],
  'documents.delete':     ['company_admin', 'sales_manager'],
  'super_admin.access':   [],  // only super_admin role
  'settings.manage':      ['company_admin'],
}

// ── Core helper — pure, no DB ─────────────────────────────────────────────────
export function can(role: string | null | undefined, action: Action): boolean {
  if (!role) return false
  if (role === ROLES.SUPER_ADMIN) return true  // super admin bypasses all
  return MATRIX[action].includes(role as Role)
}

// ── Server-side guard — fetches role from DB ──────────────────────────────────
export interface MemberContext {
  userId: string
  companyId: string
  role: Role | null
  isSuperAdmin: boolean
}

export async function getMemberContext(userId: string, companyId: string): Promise<MemberContext> {
  const supabase = createServiceClient()

  // Check if super admin
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single()

  if ((profile as any)?.is_super_admin) {
    return { userId, companyId, role: ROLES.SUPER_ADMIN, isSuperAdmin: true }
  }

  // Get company role
  const { data: member } = await (supabase as any)
    .from('company_members')
    .select('role, is_active')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single()

  const role = ((member as any)?.is_active ? (member as any)?.role : null) as Role | null
  return { userId, companyId, role, isSuperAdmin: false }
}

/**
 * checkPermission — Use in API routes after verifying the user session.
 * Returns { allowed: true } or { allowed: false, status: 403 }
 */
export async function checkPermission(
  userId: string,
  companyId: string,
  action: Action
): Promise<{ allowed: boolean }> {
  const ctx = await getMemberContext(userId, companyId)
  return { allowed: can(ctx.role, action) }
}

// ── UI helpers (client-safe, role passed as string) ───────────────────────────
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin:   '⚡ Super Admin',
    company_admin: '🛡️ Admin',
    sales_manager: '📊 Manager',
    sales_rep:     '💼 Sales Rep',
    viewer:        '👁️ Viewer',
  }
  return labels[role] ?? role
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    super_admin:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    company_admin: 'bg-violet-100 text-violet-800 border-violet-200',
    sales_manager: 'bg-blue-100 text-blue-800 border-blue-200',
    sales_rep:     'bg-emerald-100 text-emerald-800 border-emerald-200',
    viewer:        'bg-slate-100 text-slate-600 border-slate-200',
  }
  return colors[role] ?? 'bg-muted text-muted-foreground'
}

export const ALL_ROLES: Role[] = [
  'company_admin', 'sales_manager', 'sales_rep', 'viewer'
]
