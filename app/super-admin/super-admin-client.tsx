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

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical')
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
        Critical
      </span>
    )
  if (severity === 'warning')
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
        Warning
      </span>
    )
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
      Info
    </span>
  )
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
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 gap-2 text-zinc-500 text-xs font-mono">
        <Loader2 className="size-4 animate-spin text-zinc-600" />
        Loading...
      </div>
    )
  }

  if (!data) return null

  const { stats, alerts, activity, health } = data
  const totalHealth = (health.healthy + health.warning + health.critical) || 1

  // Compact KPI definitions
  const kpis = [
    { label: 'Total Companies', value: stats.totalCompanies },
    { label: 'Active', value: stats.activeCompanies },
    { label: 'Trial', value: stats.trialCompanies },
    { label: 'Suspended', value: stats.suspendedCompanies, warn: stats.suspendedCompanies > 0 },
    { label: 'Total Users', value: stats.totalUsers },
  ]

  const quickActions = [
    { href: '/super-admin/onboard-company', label: 'Onboard Company', icon: UserPlus },
    { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText },
    { href: '/super-admin/settings', label: 'Settings', icon: Settings },
    { href: '/super-admin/companies', label: 'All Companies', icon: Building2 },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/Klinqcrm-logo.png"
            alt="Klinq Logo"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-0.5">
              Platform Admin
            </p>
            <h1 className="text-sm font-semibold text-zinc-100">Overview</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-8 px-3 rounded-md transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/super-admin/onboard-company"
            className="inline-flex items-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-semibold h-8 px-3 rounded-md transition-colors"
          >
            <UserPlus className="size-3.5" />
            Onboard Company
          </Link>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 max-w-[1400px]">

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {kpis.map(k => (
            <div
              key={k.label}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2">
                {k.label}
              </p>
              <p className={`text-2xl font-semibold tabular-nums ${k.warn ? 'text-red-400' : 'text-zinc-100'}`}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* LEFT: 2/3 */}
          <div className="lg:col-span-2 space-y-5">

            {/* Platform Alerts */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-100">Platform Alerts</span>
                </div>
                {alerts.length > 0 ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
                    {alerts.length} active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-600">All clear</span>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-zinc-700" />
                  <p className="text-zinc-600 text-xs font-mono">No active alerts</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Severity</th>
                        <th className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Alert</th>
                        <th className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Company</th>
                        <th className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Time</th>
                        <th className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {alerts.map(alert => (
                        <tr key={alert.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <SeverityBadge severity={alert.severity} />
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-300">{alert.title}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{alert.company_name ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500 font-mono whitespace-nowrap">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              disabled={resolving === alert.id}
                              className="border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-7 px-2.5 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                            >
                              {resolving === alert.id ? 'Resolving…' : 'Resolve'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-100">Recent Activity</span>
                </div>
                <Link
                  href="/super-admin/audit-logs"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  View all →
                </Link>
              </div>

              {activity.length === 0 ? (
                <div className="py-10 text-center text-zinc-600 text-xs font-mono">
                  No recent activity
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {activity.map(log => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
                    >
                      <span className="text-zinc-600 text-xs font-mono w-4 shrink-0 select-none">
                        {actionIcon(log.action)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-300 font-mono">{log.action}</span>
                        <span className="text-zinc-600 text-xs mx-1.5">·</span>
                        <span className="text-xs text-zinc-500">{log.company_name}</span>
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

            {/* Company Health */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-zinc-100">Company Health</p>
                <Link
                  href="/super-admin/companies?health=critical"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Healthy', count: health.healthy, bar: 'bg-emerald-500', text: 'text-emerald-400' },
                  { label: 'Warning', count: health.warning, bar: 'bg-amber-500', text: 'text-amber-400' },
                  { label: 'Critical', count: health.critical, bar: 'bg-red-500', text: 'text-red-400' },
                ].map(row => {
                  const pct = Math.round((row.count / totalHealth) * 100)
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400">{row.label}</span>
                        <span className={`text-xs font-semibold tabular-nums ${row.text}`}>
                          {row.count}
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.bar} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-semibold text-zinc-100">Quick Actions</p>
              </div>
              <div className="p-2 space-y-0.5">
                {quickActions.map(qa => (
                  <Link
                    key={qa.href}
                    href={qa.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-zinc-800/60 text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                  >
                    <qa.icon className="size-4 text-zinc-500 shrink-0" />
                    <span>{qa.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Platform Status */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-100">Platform Status</p>
                <Link
                  href="/super-admin/monitoring"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Details →
                </Link>
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  { label: 'Database', ok: true },
                  { label: 'Auth Service', ok: true },
                  { label: 'Background Jobs', ok: true },
                  { label: 'API Routes', ok: true },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{s.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className={`text-[10px] font-mono ${s.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.ok ? 'Online' : 'Error'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
