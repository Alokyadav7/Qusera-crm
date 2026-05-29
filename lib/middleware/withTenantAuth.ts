// ─── Klinq CRM — Tenant Auth Middleware HOC ────────────────────────────────────
// Wraps Next.js API route handlers with tenant auth + RBAC enforcement.
// Use this on every /api/* route that touches company data.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { TenantContext, MemberRole } from '@/lib/types/tenant'

export type TenantHandler = (
  req: NextRequest,
  ctx: TenantContext
) => Promise<Response | NextResponse>

export interface TenantAuthOptions {
  /** Minimum role required. If empty, any authenticated member is allowed. */
  requiredRoles?: MemberRole[]
  /** Feature key that must be enabled for the company. */
  requiredFeature?: string
}

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  sales: 50,
  support: 50,
  marketing: 50,
  viewer: 10,
}

function hasRequiredRole(userRole: MemberRole, required: MemberRole[]): boolean {
  if (required.length === 0) return true
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0
  return required.some(r => userLevel >= ROLE_HIERARCHY[r])
}

/**
 * HOC: Validate session, extract tenant context, enforce RBAC.
 *
 * @example
 * export const POST = withTenantAuth(async (req, ctx) => {
 *   // ctx.companyId, ctx.userId, ctx.role are all safe to use
 *   return Response.json({ ok: true })
 * }, { requiredRoles: ['admin', 'manager'] })
 */
export function withTenantAuth(handler: TenantHandler, options: TenantAuthOptions = {}) {
  return async (req: NextRequest, routeContext?: unknown): Promise<Response | NextResponse> => {
    try {
      // 1. Validate Supabase session
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // 2. Check for active impersonation session
      const impersonationSessionId = req.cookies.get('x-impersonation-session')?.value ?? null
      let isImpersonating = false
      let activeCompanyId: string | null = null

      if (impersonationSessionId) {
        const svc = createServiceClient()
        const { data: imp } = await svc
          .from('impersonation_sessions')
          .select('target_company_id')
          .eq('id', impersonationSessionId)
          .is('ended_at', null)
          .single()
        if (imp) {
          activeCompanyId = imp.target_company_id
          isImpersonating = true
        }
      }

      // 3. Get user's active company (from user_active_company table)
      if (!activeCompanyId) {
        const { data: activeCompany } = await supabase
          .from('user_active_company')
          .select('company_id, workspace_id')
          .eq('user_id', user.id)
          .single()
        activeCompanyId = activeCompany?.company_id ?? null
      }

      if (!activeCompanyId) {
        return NextResponse.json(
          { error: 'No active company. Please complete onboarding.' },
          { status: 403 }
        )
      }

      // 4. Get member record (validates user belongs to this company)
      const svc = createServiceClient()
      const { data: member } = await svc
        .from('company_members')
        .select('role')
        .eq('company_id', activeCompanyId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single()

      // Super admin bypass: if impersonating, skip member check
      if (!member && !isImpersonating) {
        return NextResponse.json(
          { error: 'You are not a member of this company.' },
          { status: 403 }
        )
      }

      const role = (member?.role ?? 'viewer') as MemberRole

      // 5. RBAC check
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        if (!hasRequiredRole(role, options.requiredRoles)) {
          return NextResponse.json(
            { error: `Insufficient permissions. Required: ${options.requiredRoles.join(' or ')}.` },
            { status: 403 }
          )
        }
      }

      // 6. Feature flag check
      if (options.requiredFeature) {
        const { data: featureEnabled } = await svc.rpc('check_feature', {
          p_company_id: activeCompanyId,
          p_feature_key: options.requiredFeature,
        })
        if (!featureEnabled) {
          return NextResponse.json(
            { error: `Feature '${options.requiredFeature}' is not enabled on your plan.` },
            { status: 402 }
          )
        }
      }

      // 7. Get workspace and plan
      const { data: activeMembership } = await supabase
        .from('user_active_company')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      const { data: subscription } = await svc
        .from('subscriptions')
        .select('plan_id')
        .eq('company_id', activeCompanyId)
        .single()

      const ctx: TenantContext = {
        userId: user.id,
        companyId: activeCompanyId,
        workspaceId: activeMembership?.workspace_id ?? null,
        role,
        planId: subscription?.plan_id ?? '',
        isImpersonating,
        impersonationSessionId,
      }

      return handler(req, ctx)
    } catch (err) {
      console.error('[withTenantAuth] Unexpected error:', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
