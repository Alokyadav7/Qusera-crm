import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/dashboard/admin/stats
export const GET = withTenantAuth(
  async (req: NextRequest, ctx) => {
    try {
      const svc = createServiceClient()

      const [
        { data: company },
        { count: totalMembers },
        { count: activeMembers },
        { count: totalLeads },
        { count: totalDeals },
        { data: profile },
        { data: integrations },
        { data: recentLogs },
      ] = await Promise.all([
        (svc as any).from('companies').select('name, setup_complete').eq('id', ctx.companyId).single(),
        svc.from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', ctx.companyId).is('deleted_at', null),
        svc.from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', ctx.companyId).eq('is_active', true).is('deleted_at', null),
        svc.from('leads').select('*', { count: 'exact', head: true }).eq('company_id' as any, ctx.companyId),
        svc.from('deals').select('*', { count: 'exact', head: true }).eq('company_id', ctx.companyId),
        svc.from('profiles').select('onboarding_completed').eq('id', ctx.userId).single(),
        svc.from('company_integrations').select('integration_type, is_active').eq('company_id', ctx.companyId),
        svc.from('audit_logs')
          .select('id, user_email, action, entity_type, created_at')
          .eq('company_id', ctx.companyId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const setupComplete = !!(company as any)?.setup_complete
      const passwordChanged = !!profile?.onboarding_completed
      const profileComplete = !!(company as any)?.name
      const teamAdded = (totalMembers ?? 0) > 1
      const integrationConnected = (integrations ?? []).some((i: any) => i.is_active)
      const firstLead = (totalLeads ?? 0) > 0
      const firstDeal = (totalDeals ?? 0) > 0

      // If setup is not complete, check if all onboarding items are done.
      // If they are, auto-update setup_complete to true in background
      if (!setupComplete && passwordChanged && profileComplete && teamAdded && integrationConnected && firstLead && firstDeal) {
        await (svc as any).from('companies').update({ setup_complete: true }).eq('id', ctx.companyId)
      }

      return NextResponse.json({
        companyName: (company as any)?.name ?? '',
        totalMembers: totalMembers ?? 0,
        activeMembers: activeMembers ?? 0,
        totalLeads: totalLeads ?? 0,
        totalDeals: totalDeals ?? 0,
        planName: ctx.planId || 'basic',
        setupComplete: setupComplete || (passwordChanged && profileComplete && teamAdded && integrationConnected && firstLead && firstDeal),
        passwordChanged,
        profileComplete,
        teamAdded,
        integrationConnected,
        firstLead,
        firstDeal,
        recentActivity: recentLogs ?? [],
      })
    } catch (err: any) {
      console.error('[Admin Stats API Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin', 'manager'] }
)
