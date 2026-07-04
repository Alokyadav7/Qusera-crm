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
  errors?: string[]   // partial results: list any failed sub-queries
}

// Safe query wrapper — returns null on error instead of throwing, so one failure
// doesn't kill the entire KPI panel. (Fix W6: partial tolerance)
async function safeQuery<T>(promise: Promise<{ data: T | null; error: any; count?: number | null }>): Promise<{ data: T | null; count: number | null; err?: string }> {
  try {
    const res = await promise
    if (res.error) return { data: null, count: null, err: res.error.message }
    return { data: res.data, count: res.count ?? null }
  } catch (e: any) {
    return { data: null, count: null, err: e?.message ?? 'Unknown error' }
  }
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

    // ── FIX W6: Run all queries independently so one failure returns partial results
    // instead of throwing and killing the entire dashboard KPI panel.
    const [
      r_totalLeads,
      r_newLeads30d,
      r_activeInPipeline,
      r_tasksDueToday,
      r_closedWonDeals,
      r_wonThisMonth,
      r_openDeals,
    ] = await Promise.all([
      // Total leads
      safeQuery(leadsQ()),

      // New leads in last 30 days
      safeQuery((() => {
        const q = supabase.from('leads').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString())
        return companyId ? (q as any).eq('company_id', companyId) : q
      })()),

      // Active pipeline (not closed)
      safeQuery((() => {
        const q = supabase.from('leads').select('*', { count: 'exact', head: true })
          .not('status', 'in', '(closed_won,closed_lost)')
        return companyId ? (q as any).eq('company_id', companyId) : q
      })()),

      // Tasks due today (not completed)
      safeQuery((() => {
        const q = supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('is_completed', false)
          .gte('due_date', todayStart.toISOString())
          .lte('due_date', todayEnd.toISOString())
        return companyId ? (q as any).eq('company_id', companyId) : q
      })()),

      // All closed_won for conversion rate
      safeQuery((() => {
        const q = supabase.from('leads').select('deal_value, estimated_budget')
          .eq('status', 'closed_won')
        return companyId ? (q as any).eq('company_id', companyId) : q
      })()),

      // Won this month for revenue trend
      safeQuery((() => {
        const q = supabase.from('leads').select('deal_value, estimated_budget')
          .eq('status', 'closed_won')
          .gte('updated_at', monthStart.toISOString())
        return companyId ? (q as any).eq('company_id', companyId) : q
      })()),

      // Open deals value
      safeQuery((() => {
        const q = supabase.from('leads').select('deal_value, estimated_budget')
          .not('status', 'in', '(closed_won,closed_lost)')
        return companyId ? (q as any).eq('company_id', companyId) : q
      })()),
    ])

    // Collect any errors for transparency
    const errors: string[] = []
    if (r_totalLeads.err)       errors.push(`total_leads: ${r_totalLeads.err}`)
    if (r_newLeads30d.err)      errors.push(`new_leads_30d: ${r_newLeads30d.err}`)
    if (r_activeInPipeline.err) errors.push(`active_pipeline: ${r_activeInPipeline.err}`)
    if (r_tasksDueToday.err)    errors.push(`tasks_due_today: ${r_tasksDueToday.err}`)
    if (r_closedWonDeals.err)   errors.push(`total_revenue: ${r_closedWonDeals.err}`)
    if (r_wonThisMonth.err)     errors.push(`won_this_month: ${r_wonThisMonth.err}`)
    if (r_openDeals.err)        errors.push(`open_deals_value: ${r_openDeals.err}`)

    const closedWonDeals = (r_closedWonDeals.data as any[]) || []
    const wonThisMonth   = (r_wonThisMonth.data as any[]) || []
    const openDeals      = (r_openDeals.data as any[]) || []

    const totalRevenue = closedWonDeals.reduce(
      (sum: number, d: any) => sum + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0
    )
    const wonMonthRevenue = wonThisMonth.reduce(
      (sum: number, d: any) => sum + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0
    )
    const openDealsValue = openDeals.reduce(
      (sum: number, d: any) => sum + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0
    )

    const totalLeads = r_totalLeads.count ?? 0
    const closedWonCount = closedWonDeals.length
    const conversionRate = totalLeads > 0
      ? Math.round((closedWonCount / totalLeads) * 1000) / 10
      : 0

    const kpis: KPIResponse = {
      total_leads:      totalLeads,
      new_leads_30d:    r_newLeads30d.count ?? 0,
      open_deals_value: openDealsValue,
      tasks_due_today:  r_tasksDueToday.count ?? 0,
      conversion_rate:  conversionRate,
      active_pipeline:  r_activeInPipeline.count ?? 0,
      won_this_month:   wonMonthRevenue,
      total_revenue:    totalRevenue,
      ...(errors.length > 0 && { errors }),
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
