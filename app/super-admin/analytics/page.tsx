import { createServiceClient } from '@/lib/supabase/service'
import { format } from 'date-fns'
import { BarChart3, Building2, TrendingUp, Users, Shield, Calendar, Terminal, Activity, AlertCircle } from 'lucide-react'

// GET /super-admin/analytics — Server-rendered analytics dashboard
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
    active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
    trial: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
    suspended: 'bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
  }

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[1500px] relative overflow-hidden">
      {/* Decorative ambient backgrounds */}
      <div className="absolute right-[5%] top-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.02] blur-[140px] pointer-events-none" />
      <div className="absolute left-[15%] bottom-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/[0.01] blur-[160px] pointer-events-none" />

      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-6 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
          <Shield className="size-3 text-violet-400" />
          <span>Platform Metrics</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight font-display">
          System Analytics
        </h1>
        <p className="text-zinc-500 text-xs mt-1">
          Real-time metrics, cohort sizes, subscription health and active background job queues
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Total Company Cohorts', value: kpis.totalCompanies, icon: Building2, sub: `+${kpis.newThisMonth} onboarded this month`, accent: false },
          { label: 'Operational Members', value: kpis.totalUsers, icon: Users, sub: 'Active tenant members', accent: false },
          { label: 'Global Monthly Revenue', value: `₹${kpis.totalMRR.toLocaleString('en-IN')}`, icon: TrendingUp, sub: 'Active tier subscriptions only', accent: true },
          { label: 'Operational Nodes', value: `${kpis.activeCompanies} active`, icon: Activity, sub: `${kpis.trialCompanies} trial clusters live`, accent: false },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 group ${
            k.accent 
              ? 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-transparent' 
              : 'border-zinc-800/80 bg-zinc-900/35 backdrop-blur-xl hover:border-zinc-700/80'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-450 text-xs font-semibold tracking-wide">{k.label}</span>
              <div className={`p-2 rounded-xl border ${
                k.accent 
                  ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 group-hover:text-zinc-300'
              }`}>
                <k.icon className="size-4" />
              </div>
            </div>
            <p className={`text-3xl font-black tracking-tight font-display ${k.accent ? 'text-white' : 'text-white'}`}>{k.value}</p>
            <p className="text-zinc-550 text-[10px] font-mono mt-1.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts & Queue Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Status Breakdown & Queue Health */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-white text-sm font-bold tracking-tight font-display flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span>Workspace Cluster Allocation</span>
            </p>
            
            <div className="space-y-4">
              {[
                { label: 'Active Instances', count: kpis.activeCompanies, color: 'bg-emerald-500' },
                { label: 'Trial Instances', count: kpis.trialCompanies, color: 'bg-amber-500' },
                { label: 'Suspended Instances', count: kpis.suspendedCompanies, color: 'bg-red-500' },
              ].map(s => {
                const pct = kpis.totalCompanies ? Math.round(s.count / kpis.totalCompanies * 100) : 0
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-zinc-400 text-xs font-medium">{s.label}</span>
                      <span className="text-white text-xs font-semibold">{s.count} <span className="text-zinc-650 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 shadow-inner">
                      <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Job Queue Health */}
          <div className="pt-5 border-t border-zinc-850">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3">Background Queue Processor</p>
            <div className="flex gap-4">
              <div className="flex-1 bg-zinc-950/60 border border-zinc-850 rounded-2xl p-4 text-center shadow-inner">
                <p className="text-white text-xl font-bold font-mono">{kpis.pendingJobs}</p>
                <p className="text-zinc-500 text-[10px] font-semibold mt-1">Pending Cycles</p>
              </div>
              <div className={`flex-1 rounded-2xl p-4 text-center border shadow-inner ${
                kpis.failedJobs > 0 
                  ? 'bg-red-500/5 border-red-500/20' 
                  : 'bg-zinc-950/60 border-zinc-850'
              }`}>
                <p className={`text-xl font-bold font-mono ${kpis.failedJobs > 0 ? 'text-red-400' : 'text-white'}`}>
                  {kpis.failedJobs}
                </p>
                <p className="text-zinc-500 text-[10px] font-semibold mt-1">Failed Cycles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6">
          <p className="text-white text-sm font-bold tracking-tight font-display flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span>Workspace Growth (Last 6 Months)</span>
          </p>
          
          <div className="flex items-end justify-between gap-3 h-44 pt-4 px-2">
            {monthlySeries.map((m, i) => {
              const h = Math.round((m.companies / maxCompanies) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-zinc-550 text-[9px] font-mono">{m.companies || '0'}</span>
                  <div className="w-full rounded-t-lg bg-zinc-950 border border-zinc-850 relative group cursor-default h-32 flex flex-col justify-end">
                    <div 
                      className="w-full bg-gradient-to-t from-violet-600/40 to-violet-500 rounded-t-md transition-all group-hover:from-violet-500 group-hover:to-violet-400" 
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

      {/* Recent Companies table */}
      <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden relative z-10">
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/20">
          <p className="text-white text-sm font-bold tracking-tight font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span>Recently Joined Company Slots</span>
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/20 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Internal Domain Node</th>
                <th className="px-6 py-4">Status State</th>
                <th className="px-6 py-4">Onboarded Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-zinc-500 text-sm font-light">
                    No instances live.
                  </td>
                </tr>
              ) : (
                recentCompanies.map((co: any) => (
                  <tr key={co.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <a href={`/super-admin/companies/${co.id}`} className="text-zinc-200 hover:text-white text-sm font-bold transition-colors">
                        {co.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-zinc-450 text-xs font-mono">{co.slug}</td>
                    <td className="px-6 py-4">
                      <span className={STATUS_COLOR[co.status] ?? 'bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase'}>
                        {co.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-550 text-xs font-mono flex items-center gap-1.5 mt-0.5">
                      <Calendar className="size-3.5" />
                      <span>{format(new Date(co.created_at), 'dd MMM yyyy')}</span>
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
