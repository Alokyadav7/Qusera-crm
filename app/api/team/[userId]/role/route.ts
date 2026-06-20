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
      const { role } = body

      if (!role) {
        return NextResponse.json({ error: 'role is required' }, { status: 400 })
      }

      const svc = createServiceClient()

      // Fetch user profile and member record
      const { data: profile } = await svc
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }

      const { data: member } = await svc
        .from('company_members')
        .select('id, role')
        .eq('company_id', ctx.companyId)
        .eq('user_id', userId)
        .single()

      if (!member) {
        return NextResponse.json({ error: 'User is not a member of this company' }, { status: 404 })
      }

      const oldValue = { role: member.role }

      // Update in both profiles and company_members
      await Promise.all([
        svc.from('profiles').update({ role }).eq('id', userId),
        svc.from('company_members').update({ role }).eq('company_id', ctx.companyId).eq('user_id', userId)
      ])

      // Log audit
      await logAudit({
        req,
        supabase: svc,
        companyId: ctx.companyId,
        userId: ctx.userId,
        userEmail: ctx.userEmail ?? '',
        action: 'team.role_updated',
        entityType: 'company_member',
        entityId: member.id,
        oldValue,
        newValue: { role }
      })

      return NextResponse.json({ success: true, message: 'Role updated successfully' })
    } catch (err: any) {
      console.error('[Role Update API Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin'] }
)
