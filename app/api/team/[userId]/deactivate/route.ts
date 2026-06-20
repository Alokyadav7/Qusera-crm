import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

interface Ctx { params: Promise<{ userId: string }> }

export const PATCH = withTenantAuth(
  async (req: NextRequest, ctx) => {
    try {
      const { userId } = await (ctx as any).params
      const body = await req.json()
      const { isActive } = body // pass boolean isActive to set status

      if (isActive === undefined) {
        return NextResponse.json({ error: 'isActive parameter is required' }, { status: 400 })
      }

      const svc = createServiceClient()

      // Fetch user profile and member record
      const { data: profile } = await svc
        .from('profiles')
        .select('is_active')
        .eq('id', userId)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }

      const { data: member } = await svc
        .from('company_members')
        .select('id, is_active')
        .eq('company_id', ctx.companyId)
        .eq('user_id', userId)
        .single()

      if (!member) {
        return NextResponse.json({ error: 'User is not a member of this company' }, { status: 404 })
      }

      const oldValue = { is_active: member.is_active }

      // Update active status in both tables
      await Promise.all([
        svc.from('profiles').update({ is_active: isActive }).eq('id', userId),
        svc.from('company_members').update({ is_active: isActive }).eq('company_id', ctx.companyId).eq('user_id', userId)
      ])

      // Log audit
      await logAudit({
        req,
        supabase: svc,
        companyId: ctx.companyId,
        userId: ctx.userId,
        userEmail: ctx.userEmail ?? '',
        action: isActive ? 'team.member_reactivated' : 'team.member_deactivated',
        entityType: 'company_member',
        entityId: member.id,
        oldValue,
        newValue: { is_active: isActive }
      })

      return NextResponse.json({ success: true, message: `Member ${isActive ? 'reactivated' : 'deactivated'} successfully` })
    } catch (err: any) {
      console.error('[Deactivate API Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin'] }
)
