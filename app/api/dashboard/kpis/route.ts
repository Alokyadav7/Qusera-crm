import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface KPIResponse {
  total_leads: number
  new_leads_30d: number
  open_deals_value: number
  tasks_due_today: number
  conversion_rate: number
  active_pipeline: number
  won_this_month: number
  total_revenue: number
}

// GET /api/dashboard/kpis — Real aggregated KPIs scoped to active company
export async function GET(req: NextRequest) {
  try {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()

    // Get active company_id
    const { data: uac } = await (supabase as any)
      .from('user_active_company')
      .select('company_id')
      .eq('user_id', user.id)
      .single()
    const companyId = (uac as any)?.company_id as string | null

    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Base query builder — apply company filter when available
    function leadsQ() {
      const q = supabase.from('leads').select('*', { count: 'exact', head: true })
      return companyId ? (q as any).eq('company_id', companyId) : q
    }
    function tasksQ() {
      const q = supabase.from('tasks').select('*', { count: 'exact', head: true })
      return companyId ? (q as any).eq('company_id', companyId) : q
    }

    const [
      { count: totalLeads },
      { count: newLeads30d },
      { count: activeInPipeline },
      { count: tasksDueToday },
      { data: closedWonDeals },
      { data: wonThisMonth },
      { data: openDeals },
    ] = await Promise.all([
      // Total leads
      leadsQ(),

      // New leads in last 30 days
      (() => {
        const q = supabase.from('leads').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString())
        return companyId ? (q as any).eq('company_id', companyId) : q
      })(),

      // Active pipeline (not closed)
      (() => {
        const q = supabase.from('leads').select('*', { count: 'exact', head: true })
          .not('status', 'in', '(closed_won,closed_lost)')
        return companyId ? (q as any).eq('company_id', companyId) : q
      })(),

      // Tasks due today (not completed)
      (() => {
        const q = supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('is_completed', false)
          .gte('due_date', todayStart.toISOString())
          .lte('due_date', todayEnd.toISOString())
        return companyId ? (q as any).eq('company_id', companyId) : q
      })(),

      // All closed_won for conversion rate
      (() => {
        const q = supabase.from('leads').select('deal_value, estimated_budget')
          .eq('status', 'closed_won')
        return companyId ? (q as any).eq('company_id', companyId) : q
      })(),

      // Won this month for revenue trend
      (() => {
        const q = supabase.from('leads').select('deal_value, estimated_budget')
          .eq('status', 'closed_won')
          .gte('updated_at', monthStart.toISOString())
        return companyId ? (q as any).eq('company_id', companyId) : q
      })(),

      // Open deals value
      (() => {
        const q = supabase.from('leads').select('deal_value, estimated_budget')
          .not('status', 'in', '(closed_won,closed_lost)')
        return companyId ? (q as any).eq('company_id', companyId) : q
      })(),
    ])

    const totalRevenue = (closedWonDeals || []).reduce(
      (sum: number, d: any) => sum + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0
    )
    const wonMonthRevenue = (wonThisMonth || []).reduce(
      (sum: number, d: any) => sum + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0
    )
    const openDealsValue = (openDeals || []).reduce(
      (sum: number, d: any) => sum + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0
    )

    const closedWonCount = closedWonDeals?.length || 0
    const conversionRate = totalLeads && totalLeads > 0
      ? Math.round((closedWonCount / totalLeads) * 1000) / 10
      : 0

    const kpis: KPIResponse = {
      total_leads: totalLeads || 0,
      new_leads_30d: newLeads30d || 0,
      open_deals_value: openDealsValue,
      tasks_due_today: tasksDueToday || 0,
      conversion_rate: conversionRate,
      active_pipeline: activeInPipeline || 0,
      won_this_month: wonMonthRevenue,
      total_revenue: totalRevenue,
    }

    return NextResponse.json(kpis, {
      headers: {
        // Cache for 60 seconds — client side auto-refresh handles updates
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
