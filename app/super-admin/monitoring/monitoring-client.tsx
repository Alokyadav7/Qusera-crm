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

  useEffect(() => {
    fetchData()
  }, [])

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
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-zinc-955 gap-2 text-zinc-550 text-xs font-mono">
        <Loader2 className="size-4 animate-spin text-zinc-650" />
        Syncing telemetry...
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
      detail: data.services.email.configured ? 'Configured' : 'GMAIL credentials missing',
      icon: Mail,
    },
    {
      name: 'WhatsApp (Meta API)',
      online: data.services.whatsapp.configured,
      detail: data.services.whatsapp.configured ? 'Configured' : 'System token missing',
      icon: MessageSquare,
    },
    {
      name: 'SMS (Fast2SMS)',
      online: data.services.sms.configured,
      detail: data.services.sms.configured ? 'Configured' : 'SMS API key missing',
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-zinc-950 min-h-screen text-zinc-100 font-mono select-none">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
            <Shield className="size-3" />
            <span>Platform Monitoring</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Monitoring</h1>
          <p className="text-zinc-500 text-xs mt-1 font-sans">
            Real-time service status, background queues, and incident outputs from the core node.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white text-xs font-bold px-3.5 py-2 rounded border border-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Nodes
        </button>
      </div>

      {/* Service Status: Responsive 1/2/4 Grid */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Service Status Matrix</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {services.map(svc => (
            <div key={svc.name} className={`bg-zinc-950 border rounded p-4 flex items-start gap-3 transition-colors ${
              svc.online ? 'border-zinc-800' : 'border-red-950/60 bg-red-950/5'
            }`}>
              <div className={`mt-0.5 size-7 rounded flex items-center justify-center shrink-0 ${
                svc.online ? 'bg-zinc-900 border border-zinc-850' : 'bg-red-950/25 border border-red-900/30'
              }`}>
                <svc.icon className={`size-4 ${svc.online ? 'text-zinc-400' : 'text-red-400'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{svc.name}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {svc.online
                    ? <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                    : <XCircle className="size-3 text-red-400 shrink-0" />}
                  <span className={`text-xs font-bold ${svc.online ? 'text-emerald-400' : 'text-red-400'}`}>
                    {svc.online ? 'ONLINE' : 'ERROR'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-550 font-mono mt-1 truncate">{svc.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* platform Activity: Responsive 2/3/5 Grid */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Node Activity — 24h Pacing</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {activity.map(a => (
            <div key={a.label} className="bg-zinc-950 border border-zinc-800 rounded p-4 font-mono">
              <p className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">{a.label}</p>
              <p className={`text-2xl font-black mt-2 tracking-tight ${
                a.label === 'Failed Logins' && a.value > 0 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}>{a.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Background job Queue: Responsive 1/3 Grid */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Daemon Queues</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[
            { label: 'Processing Nodes', val: data.queue.processing, border: 'border-zinc-800' },
            { label: 'Pending Jobs', val: data.queue.pending, border: 'border-zinc-800' },
            { label: 'Failed Jobs', val: data.queue.failed, border: data.queue.failed > 0 ? 'border-red-950 bg-red-950/5' : 'border-zinc-800' },
          ].map(q => (
            <div key={q.label} className={`bg-zinc-950 border rounded p-4 ${q.border}`}>
              <p className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">{q.label}</p>
              <p className={`text-2xl font-black mt-2 font-mono tracking-tight ${
                q.label === 'Failed Jobs' && data.queue.failed > 0 ? 'text-red-400' : 'text-zinc-200'
              }`}>{q.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid for incident reports & error console streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Active alerts panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Active Incidents</p>
            {data.alerts.length > 0 && (
              <span className="text-[9px] font-bold text-red-400 bg-red-950/20 border border-red-900/30 px-2 py-0.5 rounded">
                {data.alerts.length} UNRESOLVED
              </span>
            )}
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
            {data.alerts.length === 0 ? (
              <div className="py-14 text-center text-zinc-650 text-xs">
                No incidents detected. Cluster is stable.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-900/10 text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                      <th className="px-4 py-2.5">Severity</th>
                      <th className="px-4 py-2.5">Alert Node</th>
                      <th className="px-4 py-2.5">Tenant</th>
                      <th className="px-4 py-2.5">Time</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {data.alerts.map(alert => (
                      <tr key={alert.id} className="hover:bg-zinc-900/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                            alert.severity === 'critical' ? 'text-red-400'
                            : alert.severity === 'warning' ? 'text-amber-400'
                            : 'text-zinc-400'
                          }`}>
                            <span className="w-1 h-1 rounded-full bg-current" />
                            {alert.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-250 font-medium leading-normal">{alert.title}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{alert.company_name ?? '—'}</td>
                        <td className="px-4 py-3 text-[10px] text-zinc-550 font-mono whitespace-nowrap">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            disabled={resolving === alert.id}
                            className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {resolving === alert.id ? 'Resolving...' : 'Resolve'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Errors console */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Live Error Stream</p>
          <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
            {data.recentErrors.length === 0 ? (
              <div className="py-14 text-center text-zinc-650 text-xs">
                No error reports in ledger.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-900/10 text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                      <th className="px-4 py-2.5">Action Source</th>
                      <th className="px-4 py-2.5">Tenant</th>
                      <th className="px-4 py-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {data.recentErrors.map(err => (
                      <tr key={err.id} className="hover:bg-zinc-900/5 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono text-zinc-300 break-all">{err.action}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">{err.company_name}</td>
                        <td className="px-4 py-2.5 text-[10px] text-zinc-550 font-mono text-right whitespace-nowrap">
                          {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Failed Background Jobs logs output */}
      {data.failedJobs.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Exceptions Console</p>
          <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden divide-y divide-zinc-900">
            {data.failedJobs.map(job => (
              <div key={job.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-200 font-bold font-mono">{job.task_name}</span>
                  <span className="text-zinc-650 font-mono text-[9px]">
                    Attempts: {job.attempts} · {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                {/* Scrollable vertical error logs containing text wraps and no horizontal overflow */}
                <pre className="bg-zinc-950 border border-zinc-900 text-red-400 text-[10.5px] font-mono p-3 rounded overflow-y-auto max-h-48 whitespace-pre-wrap break-all leading-normal select-text">
                  {job.error_message}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
