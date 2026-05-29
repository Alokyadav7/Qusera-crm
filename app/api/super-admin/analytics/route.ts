import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/analytics
// Platform-wide analytics for the super admin dashboard
export async function GET(req: NextRequest) {
  const svc = createServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: trialCompanies },
    { count: totalUsers },
    { count: newCompaniesThisMonth },
    { count: newCompaniesLastMonth },
    { data: subscriptions },
    { data: recentEvents },
    { data: jobStats },
  ] = await Promise.all([
    svc.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'trial').is('deleted_at', null),
    svc.from('company_members').select('*', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).gte('created_at', monthStart).is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd).is('deleted_at', null),
    svc.from('subscriptions').select('mrr, status').eq('status', 'active'),
    svc.from('activity_events').select('event_type, created_at, company_id').order('created_at', { ascending: false }).limit(50),
    svc.from('job_queue').select('status').in('status', ['pending', 'processing', 'failed']),
  ])

  const totalMRR = (subscriptions ?? []).reduce((sum, s) => sum + (s.mrr ?? 0), 0)
  const growth = newCompaniesLastMonth
    ? Math.round(((newCompaniesThisMonth ?? 0) - newCompaniesLastMonth) / newCompaniesLastMonth * 100)
    : null

  const pendingJobs = (jobStats ?? []).filter(j => j.status === 'pending').length
  const failedJobs = (jobStats ?? []).filter(j => j.status === 'failed').length

  // Monthly growth series (last 6 months)
  const monthlyGrowth = []
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString()
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59).toISOString()
    const { count } = await svc.from('companies').select('*', { count: 'exact', head: true })
      .gte('created_at', mStart).lte('created_at', mEnd).is('deleted_at', null)
    monthlyGrowth.push({
      month: new Date(now.getFullYear(), now.getMonth() - i, 1)
        .toLocaleString('default', { month: 'short', year: '2-digit' }),
      companies: count ?? 0,
    })
  }

  return NextResponse.json({
    overview: {
      totalCompanies: totalCompanies ?? 0,
      activeCompanies: activeCompanies ?? 0,
      trialCompanies: trialCompanies ?? 0,
      totalUsers: totalUsers ?? 0,
      totalMRR,
      newCompaniesThisMonth: newCompaniesThisMonth ?? 0,
      growth,
      pendingJobs,
      failedJobs,
    },
    monthlyGrowth,
    recentEvents: recentEvents ?? [],
  })
}
