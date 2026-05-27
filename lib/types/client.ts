// ─── Client Schema TypeScript Types ────────────────────────────────────────
// Matches: clients, client_contacts, client_addresses, roles, user_roles tables

export type ClientStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'verified'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'

export type BuyingIntent = 'high' | 'medium' | 'low'
export type ComplianceStatus = 'pending' | 'verified' | 'invalid'
export type AddressType = 'billing' | 'shipping' | 'office' | 'registered'

export type SystemRole = 'super_admin' | 'admin' | 'manager' | 'sales_rep' | 'viewer'

// ── clients ──────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  user_id: string
  name: string
  industry: string | null
  website: string | null
  gstin: string | null
  pan_number: string | null
  gst_status: ComplianceStatus
  pan_status: ComplianceStatus
  source: string
  status: ClientStatus
  buying_intent: BuyingIntent
  sentiment_score: number
  deal_value: number | null
  estimated_budget: number | null
  ai_summary: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined relations (optional, from select with joins)
  contacts?: ClientContact[]
  addresses?: ClientAddress[]
}

// ── client_contacts ───────────────────────────────────────────────────────────
export interface ClientContact {
  id: string
  client_id: string
  full_name: string
  designation: string | null
  phone_number: string | null
  email: string | null
  preferred_language: string
  is_primary: boolean
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  // joined
  client?: Pick<Client, 'id' | 'name'>
}

// ── client_addresses ──────────────────────────────────────────────────────────
export interface ClientAddress {
  id: string
  client_id: string
  client_contact_id: string | null
  address_type: AddressType
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  pincode: string | null
  country: string
  is_primary: boolean
  created_at: string
}

// ── roles ─────────────────────────────────────────────────────────────────────
export interface Role {
  id: string
  client_id: string | null        // null = system-wide role
  name: SystemRole | string
  description: string | null
  permissions: RolePermissions
  is_system: boolean
  created_at: string
}

export interface RolePermissions {
  all?: boolean
  manage_users?: boolean
  manage_roles?: boolean
  delete_leads?: boolean
  view_audit?: boolean
  manage_clients?: boolean
  view_all_data?: boolean
  view_all_leads?: boolean
  assign_tasks?: boolean
  own_leads?: boolean
  own_tasks?: boolean
  log_interactions?: boolean
  read_only?: boolean
  [key: string]: boolean | undefined
}

// ── user_roles ────────────────────────────────────────────────────────────────
export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by: string | null
  assigned_at: string
  // joined
  role?: Role
  user?: AdminUser
}

// ── admin user view ───────────────────────────────────────────────────────────
// Combination of auth.users metadata + user_roles for the admin panel
export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
  roles: Role[]
  is_active: boolean
}
