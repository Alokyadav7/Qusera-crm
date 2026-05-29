/**
 * /lib/roles.ts — Role constants and access control helper
 * Single source of truth for RBAC across the platform.
 */

// ── Role constants ────────────────────────────────────────────
export const ROLES = {
  OWNER:       'owner',
  ADMIN:       'admin',
  MANAGER:     'manager',
  SALES_REP:   'sales_rep',
  FIELD_AGENT: 'field_agent',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// ── Actions ───────────────────────────────────────────────────
export type Action =
  | 'view_super_admin'
  | 'suspend_company'
  | 'impersonate_company'
  | 'view_all_companies'
  | 'invite_members'
  | 'change_member_roles'
  | 'deactivate_members'
  | 'view_billing'
  | 'edit_company_settings'
  | 'view_all_leads'          // company-wide
  | 'view_own_leads'
  | 'create_edit_leads'
  | 'delete_leads'
  | 'view_analytics'
  | 'view_team_analytics'

// ── Access matrix ─────────────────────────────────────────────
const ACCESS_MATRIX: Record<Action, Role[]> = {
  view_super_admin:       [],                                                            // super admin only (checked separately)
  suspend_company:        [],
  impersonate_company:    [],
  view_all_companies:     [],
  invite_members:         [ROLES.OWNER, ROLES.ADMIN],
  change_member_roles:    [ROLES.OWNER],
  deactivate_members:     [ROLES.OWNER, ROLES.ADMIN],
  view_billing:           [ROLES.OWNER, ROLES.ADMIN],
  edit_company_settings:  [ROLES.OWNER, ROLES.ADMIN],
  view_all_leads:         [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
  view_own_leads:         [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES_REP, ROLES.FIELD_AGENT],
  create_edit_leads:      [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES_REP, ROLES.FIELD_AGENT],
  delete_leads:           [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
  view_analytics:         [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
  view_team_analytics:    [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
}

/**
 * canAccess — returns true if the given role can perform the action.
 * Super Admin always has access — check isSuperAdmin() separately first.
 */
export function canAccess(role: Role | string | null | undefined, action: Action): boolean {
  if (!role) return false
  return ACCESS_MATRIX[action].includes(role as Role)
}

/**
 * isAdminRole — true if role can manage company settings / team / billing
 */
export function isAdminRole(role: Role | string | null | undefined): boolean {
  return role === ROLES.OWNER || role === ROLES.ADMIN
}

/**
 * isManagerOrAbove — true if role can see all company leads + analytics
 */
export function isManagerOrAbove(role: Role | string | null | undefined): boolean {
  return role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.MANAGER
}

/** Human-readable display name for a role */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner:       'Owner',
    admin:       'Admin',
    manager:     'Manager',
    sales_rep:   'Sales Rep',
    field_agent: 'Field Agent',
  }
  return labels[role] ?? role
}
