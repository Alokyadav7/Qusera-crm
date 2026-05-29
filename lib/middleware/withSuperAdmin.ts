// ─── Klinq CRM — Super Admin Auth Middleware ───────────────────────────────────
// Wraps API routes that require platform admin (super admin) access.
// Only for /api/super-admin/* routes.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'

export type SuperAdminHandler = (
  req: NextRequest,
  adminUserId: string
) => Promise<Response | NextResponse>

/**
 * HOC: Validate super admin access via platform_admins table.
 * Logs every API call to activity_events.
 *
 * @example
 * export const GET = withSuperAdmin(async (req, adminUserId) => {
 *   return Response.json({ companies: [...] })
 * })
 */
export function withSuperAdmin(handler: SuperAdminHandler) {
  return async (req: NextRequest): Promise<Response | NextResponse> => {
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check platform_admins table
      const svc = createServiceClient()
      const { data: admin } = await svc
        .from('platform_admins')
        .select('is_active')
        .eq('user_id', user.id)
        .single()

      // Also check user metadata flag (fallback for first super admin setup)
      const metaFlag = user.user_metadata?.is_platform_admin === true

      if (!admin?.is_active && !metaFlag) {
        return NextResponse.json(
          { error: 'Super admin access required.' },
          { status: 403 }
        )
      }

      // Log the super admin API access (non-critical, best-effort)
      void emitEvent({
        actorId: user.id,
        actorType: 'super_admin',
        eventType: 'company.updated',
        metadata: {
          _type: 'super_admin_api_access',
          path: req.nextUrl.pathname,
          method: req.method,
        },
      })

      return handler(req, user.id)
    } catch (err) {
      console.error('[withSuperAdmin] Unexpected error:', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
