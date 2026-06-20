import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

interface Ctx { params: Promise<{ userId: string }> }

export const DELETE = withTenantAuth(
  async (req: NextRequest, ctx) => {
    try {
      const { userId } = await (ctx as any).params
      const url = new URL(req.url)
      
      // Support reassignToUserId in query param OR JSON body
      let reassignToUserId = url.searchParams.get('reassignToUserId')
      if (!reassignToUserId) {
        try {
          const body = await req.clone().json()
          reassignToUserId = body?.reassignToUserId
        } catch {
          // ignore parsing error
        }
      }

      if (userId === ctx.userId) {
        return NextResponse.json({ error: 'You cannot remove yourself from the company.' }, { status: 400 })
      }

      const svc = createServiceClient()

      // Fetch member to verify membership
      const { data: member } = await svc
        .from('company_members')
        .select('id, role')
        .eq('company_id', ctx.companyId)
        .eq('user_id', userId)
        .single()

      if (!member) {
        return NextResponse.json({ error: 'User is not a member of this company' }, { status: 404 })
      }

      // 1. Check if user is assigned to any leads in this company
      const { count: leadCount } = await svc
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id' as any, ctx.companyId)
        .eq('assigned_to', userId)

      // 2. Check if user is assigned to any open deals in this company
      const { count: dealCount } = await svc
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', ctx.companyId)
        .eq('assigned_to', userId)
        .not('stage', 'in', '("won","lost")')

      const totalAssignments = (leadCount ?? 0) + (dealCount ?? 0)

      if (totalAssignments > 0 && !reassignToUserId) {
        return NextResponse.json({
          error: 'REASSIGNMENT_REQUIRED',
          message: `This user is assigned to ${leadCount} leads and ${dealCount} open deals. Please select a team member to reassign them to.`,
          leadsCount: leadCount ?? 0,
          dealsCount: dealCount ?? 0,
        }, { status: 422 })
      }

      // Perform reassignment if requested and valid
      if (reassignToUserId && totalAssignments > 0) {
        // Verify target user is in the same company
        const { count: targetExists } = await svc
          .from('company_members')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', ctx.companyId)
          .eq('user_id', reassignToUserId)
          .eq('is_active', true)

        if (!targetExists) {
          return NextResponse.json({ error: 'Target user for reassignment not found or inactive.' }, { status: 400 })
        }

        // Reassign leads
        if ((leadCount ?? 0) > 0) {
          await (svc as any).from('leads')
            .update({ assigned_to: reassignToUserId, updated_at: new Date().toISOString() })
            .eq('company_id', ctx.companyId)
            .eq('assigned_to', userId)
        }

        // Reassign deals
        if ((dealCount ?? 0) > 0) {
          await (svc as any).from('deals')
            .update({ assigned_to: reassignToUserId, updated_at: new Date().toISOString() })
            .eq('company_id', ctx.companyId)
            .eq('assigned_to', userId)
            .not('stage', 'in', '("won","lost")')
        }
      }

      // Delete company membership
      const { error: deleteError } = await svc
        .from('company_members')
        .delete()
        .eq('company_id', ctx.companyId)
        .eq('user_id', userId)

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to delete member: ' + deleteError.message }, { status: 500 })
      }

      // Remove from user_active_company
      await svc.from('user_active_company')
        .delete()
        .eq('company_id', ctx.companyId)
        .eq('user_id', userId)

      // Log audit
      await logAudit({
        req,
        supabase: svc,
        companyId: ctx.companyId,
        userId: ctx.userId,
        userEmail: ctx.userEmail ?? '',
        action: 'team.member_removed',
        entityType: 'company_member',
        entityId: member.id,
        oldValue: { userId, reassignToUserId },
      })

      return NextResponse.json({ success: true, message: 'Member removed from team successfully.' })
    } catch (err: any) {
      console.error('[Remove Member API Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin'] }
)
