'use client'

import { useState, useEffect } from 'react'
import {
  Activity, Shield, Clock, AlertCircle, RefreshCw, CheckCircle2,
  AlertTriangle, Database, Terminal, Wifi, WifiOff, Mail, MessageSquare,
  Loader2, XCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface MonitoringData {
  services: {
    database: { online: boolean; latencyMs: number }
    email: { configured: boolean }
    whatsapp: { configured: boolean }
    sms: { configured: boolean }
  }
  activity24h: {
    logins: number
    failedLogins: number
    leadsCreated: number
    emailsSent: number
    whatsappSent: number
  }
  queue: { pending: number; failed: number; processing: number }
  failedJobs: { id: string; task_name: string; error_message: string; attempts: number; created_at: string }[]
  alerts: { id: string; severity: string; title: string; company_name: string; created_at: string }[]
  recentErrors: { id: string; action: string; company_name: string; created_at: string }[]
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/super-admin/monitoring')
      if (res.ok) {
        setData(await res.json())
        if (isRefresh) toast.success('Monitoring data refreshed')
      }
    } catch {
      toast.error('Failed to fetch monitoring data')
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
        setData(prev => prev ? {
          ...prev,
          alerts: prev.alerts.filter(a => a.id !== alertId)
        } : prev)
      }
    } finally {
      setResolving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black gap-2 text-zinc-500 text-xs font-mono">
        <Loader2 className="size-4 animate-spin text-zinc-400" />
        Loading monitoring data...
      </div>
    )
  }

  if (!data) return null

  const services = [
    {
      name: 'Database (Supabase)',
      online: data.services.database.online,
      detail: data.services.database.online
        ? `Online · ${data.services.database.latencyMs}ms`
        : 'Connection failed',
      icon: Database,
    },
    {
      name: 'Email (Gmail SMTP)',
      online: data.services.email.configured,
      detail: data.services.email.configured ? 'Configured' : 'GMAIL_USER or GMAIL_APP_PASSWORD missing',
      icon: Mail,
    },
    {
      name: 'WhatsApp (Meta API)',
      online: data.services.whatsapp.configured,
      detail: data.services.whatsapp.configured ? 'Configured' : 'META_SYSTEM_USER_TOKEN missing',
      icon: MessageSquare,
    },
    {
      name: 'SMS (Fast2SMS)',
      online: data.services.sms.configured,
      detail: data.services.sms.configured ? 'Configured' : 'FAST2SMS_API_KEY missing',
      icon: Wifi,
    },
  ]

  const activity = [
    { label: 'Logins (24h)', value: data.activity24h.logins },
    { label: 'Failed Logins', value: data.activity24h.failedLogins },
    { label: 'Leads Created', value: data.activity24h.leadsCreated },
    { label: 'Emails Sent', value: data.activity24h.emailsSent },
    { label: 'WhatsApp Sent', value: data.activity24h.whatsappSent },
  ]

  return (
    <div className="p-6 xl:p-10 space-y-6 bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
            <Shield className="size-3" />
            <span>Platform Monitoring</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Monitoring</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Real-time service status, platform activity, and error logs. All data from live database.</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 text-xs font-bold px-3.5 py-2 rounded border border-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Section 1: Service Status */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Service Status</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map(svc => (
            <div key={svc.name} className={`bg-zinc-950 border rounded p-4 flex items-start gap-3 transition-colors ${
              svc.online ? 'border-zinc-800' : 'border-red-900/50 bg-red-950/10'
            }`}>
              <div className={`mt-0.5 size-7 rounded flex items-center justify-center shrink-0 ${
                svc.online ? 'bg-zinc-900' : 'bg-red-950/30'
              }`}>
                <svc.icon className={`size-4 ${svc.online ? 'text-zinc-400' : 'text-red-400'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{svc.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {svc.online
                    ? <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                    : <XCircle className="size-3 text-red-400 shrink-0" />}
                  <span className={`text-xs font-bold ${svc.online ? 'text-emerald-400' : 'text-red-400'}`}>
                    {svc.online ? 'Online' : 'Error'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{svc.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: 24h Activity */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Platform Activity — Last 24 Hours</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-zinc-900 border border-zinc-900 rounded overflow-hidden">
          {activity.map(a => (
            <div key={a.label} className="bg-zinc-950 px-4 py-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{a.label}</p>
              <p className={`text-2xl font-bold mt-1 ${
                a.label === 'Failed Logins' && a.value > 0 ? 'text-red-400' : 'text-white'
              }`}>{a.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Queue Stats */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Background Job Queue</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Processing', val: data.queue.processing, cls: 'text-zinc-300' },
            { label: 'Pending', val: data.queue.pending, cls: 'text-zinc-400' },
            { label: 'Failed', val: data.queue.failed, cls: data.queue.failed > 0 ? 'text-red-400' : 'text-zinc-400' },
          ].map(q => (
            <div key={q.label} className={`bg-zinc-950 border rounded p-4 ${
              q.label === 'Failed' && data.queue.failed > 0 ? 'border-red-900/50' : 'border-zinc-900'
            }`}>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{q.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1.5 ${q.cls}`}>{q.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Active Alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Alerts</p>
          {data.alerts.length > 0 && (
            <span className="text-[10px] font-bold text-red-400 bg-red-950/20 border border-red-900/40 px-2 py-0.5 rounded">
              {data.alerts.length} unresolved
            </span>
          )}
        </div>
        <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
          {data.alerts.length === 0 ? (
            <div className="py-10 text-center text-zinc-600 text-xs font-mono">
              No active alerts — platform healthy
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/10">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Alert</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {data.alerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
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
      </div>

      {/* Section 4: Recent Errors */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Recent Errors (from Audit Logs)</p>
        <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
          {data.recentErrors.length === 0 ? (
            <div className="py-10 text-center text-zinc-600 text-xs font-mono">
              No recent errors found
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/10">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {data.recentErrors.map(err => (
                  <tr key={err.id} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-300">{err.action}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{err.company_name}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500 font-mono whitespace-nowrap">
                      {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Failed Jobs */}
      {data.failedJobs.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">Failed Background Jobs</p>
          <div className="bg-zinc-950 border border-red-900/30 rounded overflow-hidden divide-y divide-zinc-900">
            {data.failedJobs.map(job => (
              <div key={job.id} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-bold font-mono">{job.task_name}</span>
                  <span className="text-zinc-500 font-mono text-[10px]">
                    {job.attempts} attempts · {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-red-400 text-[10.5px] font-mono bg-red-950/20 border border-red-900/30 p-2.5 rounded">
                  {job.error_message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
