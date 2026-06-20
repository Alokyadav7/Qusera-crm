'use client'

import { useState, useEffect } from 'react'
import {
  Search, Shield, CheckCircle2, AlertTriangle, AlertCircle, Play,
  RefreshCw, Loader2, Eye, Terminal, Mail, User, Database, Lock,
  Wrench, Activity, ChevronDown, ChevronUp, Calendar, Link as LinkIcon
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  slug: string
  status: string
  setup_complete: boolean
  health_status?: string
}

interface SupportData {
  alerts: { id: string; severity: string; title: string; description: string; created_at: string }[]
  impersonations: { id: string; admin_email: string; admin_name: string | null; started_at: string }[]
  integrations: { id: string; type: string; is_active: boolean; status: string; last_tested_at: string | null; error_message: string | null }[]
}

interface HealthResult {
  score: number
  status: 'healthy' | 'warning' | 'critical'
  reasons: string[]
}

const TABS = [
  { id: 'details', label: 'Details & Health', icon: User },
  { id: 'issues', label: 'Active Issues', icon: AlertCircle },
  { id: 'impersonations', label: 'Impersonation logs', icon: Eye },
  { id: 'integrations', label: 'Integrations', icon: LinkIcon },
  { id: 'actions', label: 'Diagnostics & Repair', icon: Wrench },
] as const

type TabId = typeof TABS[number]['id']

const STATUS_STYLE: Record<string, string> = {
  active:    'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  suspended: 'text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
}

export function SupportCenterClient({ companies: initialCompanies }: { companies: Company[] }) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies || [])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Loading states
  const [loadingData, setLoadingData] = useState(false)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  // API Responses
  const [supportData, setSupportData] = useState<SupportData | null>(null)
  const [healthData, setHealthData] = useState<HealthResult | null>(null)
  
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [mobileSelectOpen, setMobileSelectOpen] = useState(true)

  // Fetch support details & health on company selection
  useEffect(() => {
    if (!selectedId) {
      setSupportData(null)
      setHealthData(null)
      return
    }

    setLoadingData(true)
    setSupportData(null)
    fetch(`/api/super-admin/support/${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSupportData(data) })
      .catch(() => toast.error('Failed to load company support details'))
      .finally(() => setLoadingData(false))

    setLoadingHealth(true)
    setHealthData(null)
    fetch(`/api/super-admin/companies/${selectedId}/health`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setHealthData(data) })
      .catch(() => toast.error('Failed to load health telemetry'))
      .finally(() => setLoadingHealth(false))
  }, [selectedId])

  async function resolveAlert(alertId: string) {
    setResolving(alertId)
    try {
      const res = await fetch(`/api/super-admin/alerts/${alertId}/resolve`, { method: 'POST' })
      if (res.ok) {
        toast.success('Alert resolved')
        setSupportData(prev => prev ? {
          ...prev,
          alerts: prev.alerts.filter(a => a.id !== alertId)
        } : prev)
      } else {
        toast.error('Failed to resolve alert')
      }
    } finally {
      setResolving(null)
    }
  }

  async function handleRepair() {
    if (!selectedId || !selected) return
    setRepairing(true)
    try {
      const res = await fetch('/api/super-admin/fix-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selected.admin_email }),
      })
      if (res.ok) {
        toast.success('Database schema repaired successfully')
        // Refresh health data
        const healthRes = await fetch(`/api/super-admin/companies/${selectedId}/health`)
        if (healthRes.ok) setHealthData(await healthRes.json())
      } else {
        const err = await res.json()
        toast.error(err.error || 'Repair failed')
      }
    } catch {
      toast.error('Failed to dispatch repair call')
    } finally {
      setRepairing(false)
    }
  }

  async function handleImpersonate() {
    if (!selectedId || !selected) return
    setImpersonating(true)
    try {
      const res = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedId,
          reason: `Super Admin access to ${selected.name} from Support Command Center`,
        }),
      })
      if (res.ok) {
        toast.success(`Accessing environment: ${selected.name}`)
        window.location.href = '/dashboard'
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to impersonate')
      }
    } finally {
      setImpersonating(false)
    }
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const selected = companies.find(c => c.id === selectedId) as (Company & { admin_email?: string }) | undefined

  function healthDot(status?: string) {
    if (status === 'healthy') return 'bg-emerald-450'
    if (status === 'warning') return 'bg-amber-400'
    if (status === 'critical' || status === 'suspended') return 'bg-red-400'
    return 'bg-zinc-600'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto bg-zinc-955 min-h-screen text-zinc-100 font-mono">
      
      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2 select-none">
          <Wrench className="size-3" />
          <span>Support Operations</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight uppercase select-none">Support Command Center</h1>
        <p className="text-zinc-550 text-xs mt-1 font-sans">
          Diagnose database integrity check violations, rebuild missing tenant tables, and override access sessions.
        </p>
      </div>

      {/* Main Grid Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Panel: Company Search Selection */}
        <div className="md:col-span-1 bg-zinc-950 border border-zinc-850 rounded p-4 space-y-4">
          
          {/* Mobile Collapse Toggle Header */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-350">
              Tenant Spaces ({filtered.length})
            </span>
            <button
              onClick={() => setMobileSelectOpen(v => !v)}
              className="md:hidden p-2 text-zinc-400 hover:text-white border border-zinc-850 rounded hover:bg-zinc-900 transition-colors"
              aria-label="Toggle search list"
            >
              {mobileSelectOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>

          {/* Search container inside collapse */}
          {mobileSelectOpen && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Lookup tenant namespace..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-zinc-750 transition-colors"
                />
              </div>

              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id)
                      setMobileSelectOpen(false)
                    }}
                    className={`w-full text-left p-3 rounded border text-xs transition-all flex items-center justify-between h-11 ${
                      selectedId === c.id
                        ? 'bg-zinc-800 border-zinc-700 text-white'
                        : 'bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-550 font-mono truncate">{c.slug}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ml-2 ${healthDot(c.health_status ?? c.status)}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected indicator when collapsed */}
          {!mobileSelectOpen && selected && (
            <button
              onClick={() => setMobileSelectOpen(true)}
              className="w-full p-3 rounded bg-zinc-900 border border-zinc-800 text-xs text-left flex items-center justify-between"
            >
              <div>
                <span className="text-[9px] text-zinc-550 uppercase font-bold block mb-0.5">Selected Tenant</span>
                <span className="font-bold text-white">{selected.name}</span>
              </div>
              <span className="text-[10px] text-zinc-400 border border-zinc-800 bg-zinc-950 px-2 py-1 rounded">
                Change
              </span>
            </button>
          )}
        </div>

        {/* Right Panel: Diagnosis & Actions */}
        <div className="md:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-zinc-950 border border-zinc-850 rounded p-12 text-center select-none flex flex-col items-center gap-3">
              <Activity className="size-10 text-zinc-800 mb-1" />
              <p className="text-zinc-400 text-xs font-bold uppercase">No space selected</p>
              <p className="text-zinc-550 text-[11px] font-sans max-w-sm">
                Select an environment from the directory list on the left to review operational diagnostics.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-850 rounded overflow-hidden">
              
              {/* Selected header banner */}
              <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-350">{selected.name}</h2>
                  <p className="text-[10px] text-zinc-550 mt-0.5 font-mono">{selected.slug} · ID: {selected.id}</p>
                </div>
                <div className="flex items-center gap-2 select-none">
                  <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${
                    selected.status === 'suspended' ? 'text-red-400 border-red-500/25 bg-red-500/5'
                    : !selected.setup_complete ? 'text-amber-400 border-amber-500/25 bg-amber-500/5'
                    : 'text-emerald-450 border-emerald-500/25 bg-emerald-500/5'
                  }`}>
                    {selected.status}
                  </span>
                </div>
              </div>

              {/* Tabs selector switcher */}
              <div className="border-b border-zinc-900 flex overflow-x-auto select-none bg-zinc-950/20">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap h-11 shrink-0 ${
                      activeTab === t.id
                        ? 'border-white text-white bg-zinc-900/20'
                        : 'border-transparent text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    <t.icon className="size-3.5" />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-6 space-y-6">

                {/* Tab: Details & Health */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-zinc-350 uppercase tracking-wider pb-2 border-b border-zinc-900 flex items-center gap-2">
                        <User className="size-4 text-zinc-500" /> Administrative details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-zinc-900/20 border border-zinc-900 rounded p-3 space-y-1">
                          <span className="text-[9px] uppercase font-bold text-zinc-550">Onboarding state</span>
                          <p className="text-zinc-200 font-mono uppercase font-bold">{selected.setup_complete ? 'Completed' : 'Pending wizard'}</p>
                        </div>
                        <div className="bg-zinc-900/20 border border-zinc-900 rounded p-3 space-y-1">
                          <span className="text-[9px] uppercase font-bold text-zinc-550">Isolated route mapping</span>
                          <p className="text-zinc-250 font-mono">/{selected.slug}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <p className="text-xs font-bold text-zinc-350 uppercase tracking-wider pb-2 border-b border-zinc-900 flex items-center gap-2">
                        <Activity className="size-4 text-zinc-500" /> Operational Health Index
                      </p>

                      {loadingHealth ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-zinc-550 text-xs font-mono">
                          <Loader2 className="size-4 animate-spin" /> Analyzing health status...
                        </div>
                      ) : !healthData ? (
                        <p className="text-zinc-600 text-xs">No health diagnostics computed.</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-zinc-550 uppercase font-bold">Health score</span>
                              <p className={`text-2xl font-black mt-1 ${
                                healthData.status === 'healthy' ? 'text-emerald-450'
                                : healthData.status === 'warning' ? 'text-amber-400'
                                : 'text-red-400'
                              }`}>{healthData.score} / 100</p>
                            </div>
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${
                              healthData.status === 'healthy' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5'
                              : healthData.status === 'warning' ? 'text-amber-400 border-amber-500/25 bg-amber-500/5'
                              : 'text-red-400 border-red-500/25 bg-red-500/5'
                            }`}>
                              {healthData.status}
                            </span>
                          </div>

                          {healthData.reasons.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[9px] text-zinc-550 uppercase font-bold tracking-wider">Warning & Issues ledger</span>
                              <div className="bg-zinc-950 border border-zinc-900 rounded p-4 font-mono text-[10.5px] text-zinc-450 space-y-1.5">
                                {healthData.reasons.map((r, i) => (
                                  <div key={i} className="flex items-center gap-2 text-amber-400">
                                    <AlertTriangle className="size-3.5 shrink-0" />
                                    <span>{r}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Active Issues */}
                {activeTab === 'issues' && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-zinc-350 uppercase tracking-wider pb-2 border-b border-zinc-900 flex items-center gap-2">
                      <AlertCircle className="size-4 text-zinc-500" /> Platform Incidents
                    </p>

                    {loadingData ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-zinc-550 text-xs font-mono">
                        <Loader2 className="size-4 animate-spin" /> Querying incident tracker...
                      </div>
                    ) : !supportData || supportData.alerts.length === 0 ? (
                      <div className="py-12 text-center text-zinc-600 text-xs">
                        No active incidents recorded for this workspace.
                      </div>
                    ) : (
                      <div className="border border-zinc-900 rounded overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-900/10 text-[9px] font-bold text-zinc-550 tracking-wider uppercase">
                              <th className="px-4 py-2.5">Severity</th>
                              <th className="px-4 py-2.5">Incident</th>
                              <th className="px-4 py-2.5">Recorded</th>
                              <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {supportData.alerts.map(alert => (
                              <tr key={alert.id} className="hover:bg-zinc-900/5 transition-colors">
                                <td className="px-4 py-3">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                    alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                                  }`}>
                                    {alert.severity}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-xs font-bold text-zinc-250 leading-normal">{alert.title}</p>
                                  <p className="text-[10px] text-zinc-550 font-sans mt-0.5 leading-relaxed">{alert.description}</p>
                                </td>
                                <td className="px-4 py-3 text-[10px] text-zinc-550 font-mono whitespace-nowrap">
                                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => resolveAlert(alert.id)}
                                    disabled={resolving === alert.id}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 px-2 py-1 rounded cursor-pointer h-8"
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
                )}

                {/* Tab: Impersonations Log */}
                {activeTab === 'impersonations' && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-zinc-350 uppercase tracking-wider pb-2 border-b border-zinc-900 flex items-center gap-2">
                      <Eye className="size-4 text-zinc-500" /> Impersonation audit trails
                    </p>

                    {loadingData ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-zinc-550 text-xs font-mono">
                        <Loader2 className="size-4 animate-spin" /> Querying audit trails...
                      </div>
                    ) : !supportData || supportData.impersonations.length === 0 ? (
                      <div className="py-12 text-center text-zinc-650 text-xs">
                        No impersonation history logged.
                      </div>
                    ) : (
                      <div className="border border-zinc-900 rounded overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-900/10 text-[9px] font-bold text-zinc-550 tracking-wider uppercase">
                              <th className="px-4 py-2.5">Super Admin</th>
                              <th className="px-4 py-2.5">Time Log</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {supportData.impersonations.map(imp => (
                              <tr key={imp.id} className="hover:bg-zinc-900/5 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="text-xs font-bold text-zinc-200">{imp.admin_name ?? 'Super Admin'}</p>
                                  <p className="text-[10px] text-zinc-550 font-mono mt-0.5">{imp.admin_email}</p>
                                </td>
                                <td className="px-4 py-3 text-xs text-zinc-550 font-mono">
                                  {formatDistanceToNow(new Date(imp.started_at), { addSuffix: true })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Integrations Status */}
                {activeTab === 'integrations' && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-zinc-350 uppercase tracking-wider pb-2 border-b border-zinc-900 flex items-center gap-2">
                      <LinkIcon className="size-4 text-zinc-500" /> Channel Integrations
                    </p>

                    {loadingData ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-zinc-550 text-xs font-mono">
                        <Loader2 className="size-4 animate-spin" /> Fetching integrations...
                      </div>
                    ) : !supportData || supportData.integrations.length === 0 ? (
                      <div className="py-12 text-center text-zinc-650 text-xs">
                        No communication channels connected yet.
                      </div>
                    ) : (
                      <div className="border border-zinc-900 rounded overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-900/10 text-[9px] font-bold text-zinc-550 tracking-wider uppercase">
                              <th className="px-4 py-2.5">Channel</th>
                              <th className="px-4 py-2.5">Connection status</th>
                              <th className="px-4 py-2.5">Telemetry Check</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {supportData.integrations.map(intg => (
                              <tr key={intg.id} className="hover:bg-zinc-900/5 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="text-xs font-bold text-zinc-200 capitalize">{intg.type}</p>
                                  {intg.error_message && (
                                    <p className="text-[10.5px] text-red-400 font-mono mt-0.5 leading-normal break-all max-w-[350px]">{intg.error_message}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                                    intg.is_active || intg.status === 'active' ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    <span className="w-1 h-1 rounded-full bg-current" />
                                    {intg.is_active || intg.status === 'active' ? 'Connected' : 'Error / Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[10px] text-zinc-550 font-mono whitespace-nowrap">
                                  {intg.last_tested_at
                                    ? formatDistanceToNow(new Date(intg.last_tested_at), { addSuffix: true })
                                    : 'No tests logged'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Actions & Repair */}
                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-zinc-350 uppercase tracking-wider pb-2 border-b border-zinc-900 flex items-center gap-2">
                      <Wrench className="size-4 text-zinc-500" /> Diagnostics & repair operations
                    </p>
                    
                    <p className="text-zinc-550 text-xs font-sans leading-relaxed">
                      If the tenant organization returns an "Account Setup Incomplete" error or experiences redirect loops, run the self-healing DB script to repair database membership tables automatically.
                    </p>

                    {/* Touch-friendly buttons (min 44px) */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={handleRepair}
                        disabled={repairing}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 text-xs font-bold h-11 px-4 rounded transition-all cursor-pointer disabled:opacity-40 select-none"
                      >
                        {repairing ? (
                          <Loader2 className="size-4 animate-spin text-zinc-400" />
                        ) : (
                          <Wrench className="size-4" />
                        )}
                        <span>Run DB repair script</span>
                      </button>

                      <button
                        onClick={handleImpersonate}
                        disabled={impersonating}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-zinc-955 hover:bg-zinc-100 text-xs font-bold h-11 px-4 rounded transition-all cursor-pointer disabled:opacity-40 select-none"
                      >
                        {impersonating ? (
                          <Loader2 className="size-4 animate-spin text-zinc-950" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                        <span>Impersonate workspace</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  )
}
