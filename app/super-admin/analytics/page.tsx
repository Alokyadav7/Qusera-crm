import { createServiceClient } from '@/lib/supabase/service'
import { format } from 'date-fns'
import { BarChart3, Building2, TrendingUp, Users, Shield, Calendar, Terminal, Activity, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getAnalytics() {
  const svc = createServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: trialCompanies },
    { count: suspendedCompanies },
    { count: totalUsers },
    { count: newThisMonth },
    { data: subscriptions },
    { data: recentCompanies },
    { data: jobStats },
  ] = await Promise.all([
    svc.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'trial').is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'suspended').is('deleted_at', null),
    svc.from('company_members').select('*', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    svc.from('companies').select('*', { count: 'exact', head: true }).gte('created_at', monthStart).is('deleted_at', null),
    svc.from('subscriptions').select('mrr, status, plan_id'),
    svc.from('companies').select('id, name, slug, status, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(8),
    svc.from('job_queue').select('status').in('status', ['pending', 'failed', 'processing']),
  ])

  // Monthly series (last 6 months)
  const monthlySeries = []
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString()
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59).toISOString()
    const { count: cnt } = await svc.from('companies').select('*', { count: 'exact', head: true })
      .gte('created_at', mStart).lte('created_at', mEnd).is('deleted_at', null)
    monthlySeries.push({
      month: new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString('default', { month: 'short' }),
      companies: cnt ?? 0,
    })
  }

  const totalMRR = (subscriptions ?? []).filter(s => s.status === 'active').reduce((sum, s) => sum + (s.mrr ?? 0), 0)
  const pendingJobs = (jobStats ?? []).filter(j => j.status === 'pending').length
  const failedJobs = (jobStats ?? []).filter(j => j.status === 'failed').length

  return {
    kpis: {
      totalCompanies: totalCompanies ?? 0,
      activeCompanies: activeCompanies ?? 0,
      trialCompanies: trialCompanies ?? 0,
      suspendedCompanies: suspendedCompanies ?? 0,
      totalUsers: totalUsers ?? 0,
      newThisMonth: newThisMonth ?? 0,
      totalMRR,
      pendingJobs,
      failedJobs,
    },
    monthlySeries,
    recentCompanies: recentCompanies ?? [],
  }
}

export default async function SuperAdminAnalyticsPage() {
  const data = await getAnalytics()
  const { kpis, monthlySeries, recentCompanies } = data
  const maxCompanies = Math.max(...monthlySeries.map(m => m.companies), 1)

  const STATUS_COLOR: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
    trial: 'text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
    suspended: 'text-red-400 bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  }

  return (
    <div className="p-6 xl:p-10 space-y-6 max-w-[1600px] bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">
      
      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
          <Shield className="size-3 text-zinc-350" />
          <span>Platform Metrics</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight font-display select-none">
          System Analytics
        </h1>
        <p className="text-zinc-500 text-xs mt-0.5">
          Real-time metrics, cohort sizes, subscription health and active background job queues
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 select-none">
        {[
          { label: 'Total Company Cohorts', value: kpis.totalCompanies, icon: Building2, sub: `+${kpis.newThisMonth} onboarded this month` },
          { label: 'Operational Members', value: kpis.totalUsers, icon: Users, sub: 'Active tenant members' },
          { label: 'Global Monthly Revenue', value: `₹${kpis.totalMRR.toLocaleString('en-IN')}`, icon: TrendingUp, sub: 'Active tier subscriptions only' },
          { label: 'Operational Nodes', value: `${kpis.activeCompanies} active`, icon: Activity, sub: `${kpis.trialCompanies} trial clusters live` },
        ].map(k => (
          <div key={k.label} className="bg-zinc-950 border border-zinc-900 rounded p-4.5 hover:border-zinc-800 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-550 text-[10px] font-bold uppercase tracking-wider">{k.label}</span>
              <k.icon className="size-4 text-zinc-550" />
            </div>
            <p className="text-white text-2xl font-bold font-mono tracking-tight leading-none">{k.value}</p>
            <p className="text-zinc-500 text-[10px] mt-2 font-sans font-light">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts & Queue Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown & Queue Health */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-5 space-y-5 select-none">
          <div>
            <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Workspace Cluster Allocation</span>
            </p>
            
            <div className="space-y-3.5">
              {[
                { label: 'Active Instances', count: kpis.activeCompanies, color: 'bg-zinc-300' },
                { label: 'Trial Instances', count: kpis.trialCompanies, color: 'bg-zinc-600' },
                { label: 'Suspended Instances', count: kpis.suspendedCompanies, color: 'bg-zinc-800' },
              ].map(s => {
                const pct = kpis.totalCompanies ? Math.round(s.count / kpis.totalCompanies * 100) : 0
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="text-zinc-450 font-medium">{s.label}</span>
                      <span className="text-zinc-300 font-bold">{s.count} <span className="text-zinc-650 font-mono">({pct}%)</span></span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-900">
                      <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Job Queue Health */}
          <div className="pt-4 border-t border-zinc-900">
            <p className="text-zinc-550 text-[9px] font-bold uppercase tracking-wider mb-2.5">Background Queue Processor</p>
            <div className="flex gap-3 text-xs">
              <div className="flex-1 bg-zinc-900/30 border border-zinc-900 rounded p-3 text-center">
                <p className="text-white text-base font-bold font-mono">{kpis.pendingJobs}</p>
                <p className="text-zinc-550 text-[10px] mt-0.5">Pending Cycles</p>
              </div>
              <div className={`flex-1 rounded p-3 text-center border ${
                kpis.failedJobs > 0 
                  ? 'bg-red-500/5 border-red-500/20 text-red-400' 
                  : 'bg-zinc-900/30 border-zinc-900 text-zinc-300'
              }`}>
                <p className="text-base font-bold font-mono">{kpis.failedJobs}</p>
                <p className="text-zinc-550 text-[10px] mt-0.5">Failed Cycles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="bg-zinc-950 border border-zinc-900 rounded p-5 select-none">
          <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>Workspace Growth (Last 6 Months)</span>
          </p>
          
          <div className="flex items-end justify-between gap-3 h-44 pt-4">
            {monthlySeries.map((m, i) => {
              const h = Math.round((m.companies / maxCompanies) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-zinc-550 text-[9px] font-mono">{m.companies || '0'}</span>
                  <div className="w-full rounded-t bg-zinc-900 border border-zinc-900 relative group cursor-default h-32 flex flex-col justify-end">
                    <div 
                      className="w-full bg-zinc-500 rounded-t transition-colors group-hover:bg-zinc-400" 
                      style={{ height: `${Math.max(h, 6)}%` }} 
                    />
                  </div>
                  <span className="text-zinc-500 text-[10px] font-semibold mt-1 uppercase tracking-wider">{m.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Companies Table */}
      <div className="bg-zinc-955 border border-zinc-900 rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-900/10">
          <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Recently Joined Company Slots</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/5 text-[9px] font-bold text-zinc-550 tracking-wider uppercase">
                <th className="px-5 py-3">Company Name</th>
                <th className="px-5 py-3">Internal Domain Node</th>
                <th className="px-5 py-3">Status State</th>
                <th className="px-5 py-3">Onboarded Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {recentCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-zinc-550 text-xs font-mono">
                    No instances live.
                  </td>
                </tr>
              ) : (
                recentCompanies.map((co: any) => (
                  <tr key={co.id} className="hover:bg-zinc-900/10 transition-colors group">
                    <td className="px-5 py-3">
                      <a href={`/super-admin/companies/${co.id}`} className="text-zinc-200 hover:text-white text-xs font-bold transition-colors">
                        {co.name}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs font-mono">{co.slug}</td>
                    <td className="px-5 py-3">
                      <span className={STATUS_COLOR[co.status] ?? 'text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider'}>
                        {co.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-zinc-650" />
                        <span>{format(new Date(co.created_at), 'dd MMM yyyy')}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
