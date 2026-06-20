'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2,
  AlertCircle,
  UserPlus,
  FileText,
  Settings,
  Activity,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Eye,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  Users
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface OverviewData {
  stats: {
    totalCompanies: number
    activeCompanies: number
    trialCompanies: number
    suspendedCompanies: number
    totalUsers: number
  }
  alerts: {
    id: string
    severity: string
    title: string
    company_name: string | null
    created_at: string
  }[]
  activity: {
    id: string
    action: string
    company_name: string
    created_at: string
  }[]
  health: {
    healthy: number
    warning: number
    critical: number
  }
}

interface Company {
  id: string
  name: string
  slug: string
  status: string
  plan_id: string | null
  created_at: string
  setup_complete: boolean
  member_count?: number
  last_active_at?: string
  health_status?: string
  subscription?: { plan?: { display_name: string } } | null
}

function actionIcon(action: string) {
  if (action.includes('suspend')) return '⚠'
  if (action.includes('onboard') || action.includes('created')) return '↑'
  if (action.includes('impersonat')) return '→'
  if (action.includes('invite') || action.includes('accepted')) return '✓'
  if (action.includes('fail') || action.includes('error')) return '✕'
  return '·'
}

export function SuperAdminOverviewClient({ adminName }: { adminName: string }) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Activity Feed search and filter
  const [activitySearch, setActivitySearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [overviewRes, companiesRes] = await Promise.all([
        fetch('/api/super-admin/overview'),
        fetch('/api/super-admin/companies')
      ])
      
      if (overviewRes.ok && companiesRes.ok) {
        setData(await overviewRes.json())
        const companiesData = await companiesRes.json()
        setCompanies(companiesData.companies || [])
        if (isRefresh) toast.success('Dashboard refreshed')
      } else {
        toast.error('Failed to load overview data')
      }
    } catch {
      toast.error('Failed to load overview data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function resolveAlert(alertId: string) {
    setResolving(alertId)
    try {
      const res = await fetch(`/api/super-admin/alerts/${alertId}/resolve`, { method: 'POST' })
      if (res.ok) {
        toast.success('Alert resolved')
        setData(prev => prev ? { ...prev, alerts: prev.alerts.filter(a => a.id !== alertId) } : prev)
      }
    } finally {
      setResolving(null)
    }
  }

  const getCompanyHealth = (c: Company): { label: string; cls: string } => {
    if (c.status === 'suspended') return { label: 'Critical', cls: 'text-red-400 border-red-500/20 bg-red-500/5' }
    if (!c.setup_complete) return { label: 'Warning', cls: 'text-amber-400 border-amber-500/20 bg-amber-500/5' }
    if ((c.member_count ?? 0) === 0) return { label: 'Critical', cls: 'text-red-400 border-red-500/20 bg-red-500/5' }
    return { label: 'Healthy', cls: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' }
  }

  async function handleImpersonate(companyId: string, companyName: string) {
    try {
      const res = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          reason: `Super Admin access to ${companyName} from Dashboard Overview`,
        }),
      })
      if (res.ok) {
        toast.success(`Now viewing as ${companyName}`)
        window.location.href = '/dashboard'
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to impersonate')
      }
    } catch {
      toast.error('Impersonation failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-zinc-950 gap-2 text-zinc-500 text-xs font-mono">
        <Loader2 className="size-4 animate-spin text-zinc-600" />
        Loading SaaS OS...
      </div>
    )
  }

  if (!data) return null

  const { stats, alerts, activity } = data

  const kpis = [
    { label: 'Total Instances', value: stats.totalCompanies },
    { label: 'Active Sites', value: stats.activeCompanies },
    { label: 'Trial Clusters', value: stats.trialCompanies },
    { label: 'Suspended Spaces', value: stats.suspendedCompanies, warn: stats.suspendedCompanies > 0 },
    { label: 'Total User Nodes', value: stats.totalUsers },
  ]

  // Group alerts by severity
  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')
  const infoAlerts = alerts.filter(a => a.severity === 'info')

  // Filtered Activity Feed
  const filteredActivity = activity.filter(log => {
    const matchSearch = !activitySearch || 
      log.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
      log.company_name.toLowerCase().includes(activitySearch.toLowerCase())
    
    const matchFilter = activityFilter === 'all' ||
      (activityFilter === 'critical' && log.action.includes('suspend')) ||
      (activityFilter === 'success' && (log.action.includes('onboard') || log.action.includes('created') || log.action.includes('accepted')))
    
    return matchSearch && matchFilter
  })

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      
      {/* Overview Page Header */}
      <div className="border-b border-zinc-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none bg-zinc-950">
        <div>
          <h1 className="text-base font-bold text-zinc-100 font-mono tracking-tight uppercase">Dashboard Overview</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Real-time SaaS operational indicators and isolated environment states.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs h-8 px-3.5 rounded transition-all cursor-pointer disabled:opacity-40 font-semibold"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh OS
          </button>
          <Link
            href="/super-admin/onboard-company"
            className="inline-flex items-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold h-8 px-3.5 rounded transition-colors"
          >
            <UserPlus className="size-3.5" />
            Onboard Tenant
          </Link>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ── Row 1: Responsive KPI Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {kpis.map(k => (
            <div
              key={k.label}
              className="bg-zinc-950 border border-zinc-800 rounded p-4 font-mono select-none"
            >
              <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-550 mb-2">
                {k.label}
              </p>
              <p className={`text-2xl font-black tracking-tight tabular-nums ${k.warn ? 'text-red-400' : 'text-zinc-100'}`}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Row 2: Platform Alerts (3 columns / stacks) ── */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">Platform Incident Matrix</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Critical Alerts */}
            <div className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="size-4 shrink-0" /> Critical ({criticalAlerts.length})
                </span>
                {criticalAlerts.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
              </div>
              
              <div className="flex-1 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {criticalAlerts.length === 0 ? (
                  <p className="text-zinc-600 text-xs font-mono py-4">No critical incidents reported</p>
                ) : (
                  criticalAlerts.map(a => (
                    <div key={a.id} className="bg-red-500/5 border border-red-500/10 rounded p-2.5 space-y-2">
                      <p className="text-xs text-red-200 font-medium leading-normal">{a.title}</p>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                        <span>{a.company_name ?? 'Platform Core'}</span>
                        <button
                          onClick={() => resolveAlert(a.id)}
                          disabled={resolving === a.id}
                          className="text-red-400 hover:text-red-300 font-bold uppercase transition-all disabled:opacity-40"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Warning Alerts */}
            <div className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="size-4 shrink-0" /> Warning ({warningAlerts.length})
                </span>
              </div>
              
              <div className="flex-1 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {warningAlerts.length === 0 ? (
                  <p className="text-zinc-600 text-xs font-mono py-4">No warning alerts recorded</p>
                ) : (
                  warningAlerts.map(a => (
                    <div key={a.id} className="bg-amber-500/5 border border-amber-500/10 rounded p-2.5 space-y-2">
                      <p className="text-xs text-amber-200 font-medium leading-normal">{a.title}</p>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                        <span>{a.company_name ?? 'Platform Core'}</span>
                        <button
                          onClick={() => resolveAlert(a.id)}
                          disabled={resolving === a.id}
                          className="text-amber-400 hover:text-amber-300 font-bold uppercase transition-all disabled:opacity-40"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info Alerts */}
            <div className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="size-4 shrink-0" /> Information ({infoAlerts.length})
                </span>
              </div>
              
              <div className="flex-1 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {infoAlerts.length === 0 ? (
                  <p className="text-zinc-600 text-xs font-mono py-4">No system notices</p>
                ) : (
                  infoAlerts.map(a => (
                    <div key={a.id} className="bg-zinc-900/30 border border-zinc-800 rounded p-2.5 space-y-2">
                      <p className="text-xs text-zinc-300 font-medium leading-normal">{a.title}</p>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                        <span>{a.company_name ?? 'Platform Core'}</span>
                        <button
                          onClick={() => resolveAlert(a.id)}
                          disabled={resolving === a.id}
                          className="text-zinc-300 hover:text-white font-bold uppercase transition-all disabled:opacity-40"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Row 3: Company Health Table / Cards ── */}
        <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-900/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">Company clusters & state</span>
            <Link href="/super-admin/companies" className="text-zinc-500 hover:text-white text-xs font-semibold transition-colors">
              Manage spaces →
            </Link>
          </div>

          {companies.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-xs font-mono">No tenant companies registered</div>
          ) : (
            <>
              {/* Desktop & Tablet Viewport Table (>=640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-900/20 text-[9px] font-bold text-zinc-500 tracking-widest uppercase">
                      <th className="px-5 py-3">Tenant Instance</th>
                      <th className="px-5 py-3">Health status</th>
                      <th className="px-5 py-3">Users</th>
                      <th className="px-5 py-3 hidden md:table-cell">Plan Tier</th>
                      <th className="px-5 py-3 hidden md:table-cell">Status</th>
                      <th className="px-5 py-3 text-right">Operation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {companies.slice(0, 10).map(c => {
                      const health = getCompanyHealth(c)
                      return (
                        <tr key={c.id} className="hover:bg-zinc-900/10 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="text-zinc-200 text-xs font-bold">{c.name}</span>
                            <span className="text-zinc-650 text-[10px] font-mono block mt-0.5">{c.slug}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${health.cls}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {health.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-300 text-xs font-mono font-medium">
                            {c.member_count ?? 0} nodes
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                              {c.subscription?.plan?.display_name ?? c.plan_id ?? 'Free'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell text-xs uppercase font-bold tracking-wider font-mono">
                            <span className={
                              c.status === 'suspended' ? 'text-red-400' : 
                              c.status === 'trial' ? 'text-amber-400' : 'text-emerald-400'
                            }>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleImpersonate(c.id, c.name)}
                              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[10px] font-bold px-2.5 py-1.5 rounded transition-all cursor-pointer"
                            >
                              <Eye className="size-3" /> Impersonate
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Viewport Card List (<640px) */}
              <div className="sm:hidden p-4 space-y-3">
                {companies.slice(0, 10).map(c => {
                  const health = getCompanyHealth(c)
                  return (
                    <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-3">
                      <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{c.name}</p>
                          <p className="text-[10px] text-zinc-550 font-mono">{c.slug}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${health.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {health.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-zinc-550">
                        <div>
                          <p className="text-[9px] text-zinc-650 uppercase font-bold">Users</p>
                          <p className="text-zinc-300 mt-0.5">{c.member_count ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-650 uppercase font-bold">Plan</p>
                          <p className="text-zinc-300 mt-0.5">{c.subscription?.plan?.display_name ?? c.plan_id ?? 'Free'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-650 uppercase font-bold">Status</p>
                          <p className={`mt-0.5 uppercase ${c.status === 'suspended' ? 'text-red-400' : 'text-emerald-450'}`}>{c.status}</p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => handleImpersonate(c.id, c.name)}
                          className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-xs font-bold h-11 rounded hover:bg-zinc-800 transition-colors"
                        >
                          <Eye className="size-4" /> Impersonate
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Row 4: Audit Activity Log Feed ── */}
        <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">Platform Activity Feed</span>
            
            {/* Search & Filter bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={activitySearch}
                  onChange={e => setActivitySearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-7 pr-2.5 py-1 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 font-mono"
                />
              </div>

              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded w-full sm:w-auto">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'critical', label: 'Incidents' },
                  { value: 'success', label: 'Setup' },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => setActivityFilter(f.value)}
                    className={`flex-1 sm:flex-initial px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                      activityFilter === f.value ? 'bg-zinc-700 text-white' : 'text-zinc-550 hover:text-zinc-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-zinc-900">
            {filteredActivity.length === 0 ? (
              <div className="py-12 text-center text-zinc-650 text-xs font-mono">No matching activity records</div>
            ) : (
              filteredActivity.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-900/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-zinc-550 text-xs font-mono w-4 shrink-0 select-none text-center">
                      {actionIcon(log.action)}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <span className="text-xs text-zinc-300 font-mono break-all">{log.action}</span>
                      <span className="text-zinc-600 text-xs mx-2">·</span>
                      <span className="text-xs text-zinc-500 font-semibold">{log.company_name}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
