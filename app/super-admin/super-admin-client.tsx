'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building2, Users, AlertCircle, AlertTriangle, Info,
  UserPlus, FileText, Settings, CreditCard, BarChart3, Activity,
  ArrowRight, CheckCircle2, Loader2, RefreshCw
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
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/super-admin/overview')
      if (res.ok) {
        setData(await res.json())
        if (isRefresh) toast.success('Dashboard refreshed')
      }
    } catch {
      toast.error('Failed to load overview data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchData() }, [])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black gap-2 text-zinc-500 text-xs font-mono">
        <Loader2 className="size-4 animate-spin text-zinc-400" />
        Loading...
      </div>
    )
  }

  if (!data) return null

  const { stats, alerts, activity, health } = data
  const totalHealth = (health.healthy + health.warning + health.critical) || 1

  const quickActions = [
    { href: '/super-admin/onboard-company', label: '+ Onboard New Company', icon: UserPlus },
    { href: '/super-admin/audit-logs', label: '→ View Audit Logs', icon: FileText },
    { href: '/super-admin/settings', label: '⚙ Platform Settings', icon: Settings },
    { href: '/super-admin/companies', label: '↗ All Companies', icon: Building2 },
  ]

  return (
    <div className="p-6 xl:p-10 space-y-6 max-w-[1600px] bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-1">Overview</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Overview</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Signed in as <span className="text-zinc-300 font-semibold">{adminName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 text-xs font-bold px-3 py-2 rounded border border-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/super-admin/onboard-company"
            className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-3.5 py-2 rounded transition-all"
          >
            <UserPlus className="size-3.5" />
            Onboard Company
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT: 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Horizontal Metrics Bar */}
          <div className="grid grid-cols-5 gap-px bg-zinc-900 border border-zinc-900 rounded overflow-hidden">
            {[
              { label: 'Total Companies', value: stats.totalCompanies },
              { label: 'Active', value: stats.activeCompanies },
              { label: 'Trial', value: stats.trialCompanies },
              { label: 'Suspended', value: stats.suspendedCompanies },
              { label: 'Total Users', value: stats.totalUsers },
            ].map(s => (
              <div key={s.label} className="bg-zinc-950 px-4 py-4">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Platform Alerts */}
          <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-900/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-zinc-400" />
                <p className="text-sm font-semibold text-white">Platform Alerts</p>
              </div>
              {alerts.length > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/30 text-red-400 border border-red-900/40">
                  {alerts.length} active
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-600">All clear</span>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="size-6 text-zinc-700" />
                <p className="text-zinc-600 text-xs font-mono">No active alerts — platform healthy</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-900/5">
                    <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Severity</th>
                    <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Alert</th>
                    <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Company</th>
                    <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Time</th>
                    <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {alerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-zinc-900/10 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                          alert.severity === 'critical' ? 'text-red-400'
                          : alert.severity === 'warning' ? 'text-amber-400'
                          : 'text-blue-400'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-200 font-medium">{alert.title}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{alert.company_name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 font-mono whitespace-nowrap">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          disabled={resolving === alert.id}
                          className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {resolving === alert.id ? 'Resolving...' : 'Resolve'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-900/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-zinc-400" />
                <p className="text-sm font-semibold text-white">Recent Activity</p>
              </div>
              <Link href="/super-admin/audit-logs" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            {activity.length === 0 ? (
              <div className="py-10 text-center text-zinc-600 text-xs font-mono">No recent activity</div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {activity.map(log => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/10 transition-colors">
                    <span className="text-zinc-500 text-sm font-mono w-4 shrink-0">{actionIcon(log.action)}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-zinc-300 font-mono">{log.action}</span>
                      <span className="text-zinc-600 text-xs mx-1.5">—</span>
                      <span className="text-xs text-zinc-400 font-semibold">{log.company_name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="space-y-4">

          {/* Company Health Summary */}
          <div className="bg-zinc-950 border border-zinc-900 rounded p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Company Health</p>
              <Link href="/super-admin/companies?health=critical" className="text-xs text-zinc-500 hover:text-white transition-colors">
                View all →
              </Link>
            </div>
            {[
              { label: 'Healthy', count: health.healthy, color: 'bg-emerald-500', dot: 'bg-emerald-400' },
              { label: 'Warning', count: health.warning, color: 'bg-amber-500', dot: 'bg-amber-400' },
              { label: 'Critical', count: health.critical, color: 'bg-red-500', dot: 'bg-red-400' },
            ].map(row => {
              const pct = Math.round((row.count / totalHealth) * 100)
              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                      {row.label}
                    </span>
                    <span className="font-bold text-zinc-200">{row.count}</span>
                  </div>
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-900/10">
              <p className="text-sm font-semibold text-white">Quick Actions</p>
            </div>
            <div className="p-2 space-y-1">
              {quickActions.map(qa => (
                <Link
                  key={qa.href}
                  href={qa.href}
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-sm text-zinc-300 hover:text-white transition-all group"
                >
                  <qa.icon className="size-4 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
                  <span>{qa.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Status */}
          <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-900/10">
              <p className="text-sm font-semibold text-white">Platform Status</p>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <Link href="/super-admin/monitoring" className="text-[10px] text-zinc-500 hover:text-white transition-colors float-right">
                Details →
              </Link>
              {[
                { label: 'Database', ok: true },
                { label: 'Auth Service', ok: true },
                { label: 'Background Jobs', ok: true },
                { label: 'API Routes', ok: true },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-zinc-400">{s.label}</span>
                  <span className={`flex items-center gap-1 font-medium ${s.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {s.ok ? 'Online' : 'Error'}
                  </span>
                </div>
              ))}
              <div className="pt-1 border-t border-zinc-900">
                <Link href="/super-admin/monitoring" className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                  View full service status →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
