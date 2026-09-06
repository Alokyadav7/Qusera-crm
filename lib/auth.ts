/**
 * /lib/auth.ts — Server-side auth helpers
 * Use in Server Components, Route Handlers, and middleware.
 * Never import in client components — use createClient() from /lib/supabase/client instead.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Role } from '@/lib/permissions'
import { normalizeRole } from '@/lib/permissions'

export interface SessionUser {
  id: string
  email: string | undefined
  role: Role | null         // company member role
  companyId: string | null
  isSuperAdmin: boolean
  onboardingComplete: boolean
}

/**
 * getSession — resolves the current user's full session context.
 * Returns null if not authenticated.
 * Runs 2 DB queries (platform_admins + company_members) server-side.
 */
export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const svc = createServiceClient()

  // 1. Check super admin
  const { data: adminRecord } = await svc
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const metaFlag =
    user.user_metadata?.is_platform_admin === true ||
    (user as any).app_metadata?.is_platform_admin === true

  const isSuperAdmin = !!adminRecord || metaFlag

  if (isSuperAdmin) {
    return {
      id: user.id,
      email: user.email,
      role: null,
      companyId: null,
      isSuperAdmin: true,
      onboardingComplete: true,
    }
  }

  // 2. Check company member & company details via join
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id, role, is_active, companies(onboarding_completed_at, status, deleted_at)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!member) {
    return {
      id: user.id,
      email: user.email,
      role: null,
      companyId: null,
      isSuperAdmin: false,
      onboardingComplete: false,
    }
  }

  const company = member.companies

  if (!company || company.deleted_at || company.status === 'deleted') {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: member.role as Role,
    companyId: member.company_id,
    isSuperAdmin: false,
    onboardingComplete: !!company.onboarding_completed_at,
  }
}

/**
 * requireSession — same as getSession but throws redirect if not authenticated.
 * Use in Server Components / layouts where unauthenticated access is not allowed.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
    throw new Error('Redirecting')
  }
  return session
}

/**
 * requireSuperAdmin — throws redirect unless user is super admin.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireSession()
  if (!session.isSuperAdmin) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
  }
  return session
}

/**
 * requireCompanyAdmin — throws redirect unless user is owner or admin.
 */
export async function requireCompanyAdmin(): Promise<SessionUser> {
  const session = await requireSession()
  if (session.isSuperAdmin) return session // super admin can see everything
  const normalized = session.role ? normalizeRole(session.role) : null
  if (normalized !== 'company_admin') {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
  }
  return session
}

/**
 * isSuperAdmin — lightweight check using only auth metadata (no extra DB query).
 * Suitable for middleware where speed matters.
 */
export function isSuperAdminFromMeta(userMeta: Record<string, any>): boolean {
  return userMeta?.is_platform_admin === true
}

/**
 * getCompanyId — returns the current user's company_id, or null.
 */
export async function getCompanyId(): Promise<string | null> {
  const session = await getSession()
  return session?.companyId ?? null
}
