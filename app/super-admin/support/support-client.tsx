'use client'

import { useState, useEffect } from 'react'
import {
  Search, Shield, Eye, RefreshCw, Clock, AlertCircle,
  CheckCircle2, Wifi, WifiOff, Mail, MessageSquare, Loader2
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

type SupportTab = 'issues' | 'impersonation' | 'integrations'

export function SupportCenterClient({ companies }: { companies: Company[] }) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [supportData, setSupportData] = useState<SupportData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [tab, setTab] = useState<SupportTab>('issues')
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  const filteredCompanies = companies.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const selectedCompany = companies.find(c => c.id === selectedId)

  useEffect(() => {
    if (!selectedId) return
    setLoadingData(true)
    setSupportData(null)
    fetch(`/api/super-admin/support/${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSupportData(data) })
      .catch(() => toast.error('Failed to load company support data'))
      .finally(() => setLoadingData(false))
  }, [selectedId])

  async function handleImpersonate() {
    if (!selectedId || !selectedCompany) return
    setImpersonating(selectedId)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedId }),
      })
      if (res.ok) {
        toast.success(`Impersonating ${selectedCompany.name}`)
        window.location.href = '/dashboard'
      } else {
        const err = await res.json()
        toast.error(err.error || 'Impersonation failed')
      }
    } finally {
      setImpersonating(null)
    }
  }

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
      }
    } finally {
      setResolving(null)
    }
  }

  function healthDot(status?: string) {
    if (status === 'healthy') return 'bg-emerald-400'
    if (status === 'warning') return 'bg-amber-400'
    if (status === 'critical') return 'bg-red-400'
    if (status === 'suspended') return 'bg-red-400'
    return 'bg-zinc-600'
  }

  return (
    <div className="p-6 xl:p-10 space-y-6 bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">

      {/* Header */}
      <div className="border-b border-zinc-900 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
          <Shield className="size-3" />
          <span>Support Center</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Support Center</h1>
        <p className="text-zinc-500 text-xs mt-0.5">
          Look up any company to view its active issues, impersonation history, and integration status.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* LEFT PANEL: Company lookup */}
        <div className="lg:col-span-1 bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-900/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-900 max-h-[600px] overflow-y-auto">
            {filteredCompanies.length === 0 ? (
              <div className="py-10 text-center text-zinc-600 text-xs font-mono">No companies found</div>
            ) : filteredCompanies.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); setTab('issues') }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-900/30 transition-colors ${
                  selectedId === c.id ? 'bg-zinc-900/40 border-l-2 border-white' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${healthDot(c.health_status ?? c.status)}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{c.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{c.slug}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Company support view */}
        <div className="lg:col-span-2">
          {!selectedCompany ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded py-20 flex flex-col items-center gap-3 text-center">
              <Search className="size-8 text-zinc-700" />
              <p className="text-zinc-500 text-sm font-medium">Select a company to view support details</p>
              <p className="text-zinc-600 text-xs">Search on the left and click any company</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Company header */}
              <div className="flex items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 rounded px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">{selectedCompany.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{selectedCompany.slug} · {selectedCompany.status}</p>
                </div>
                <button
                  onClick={handleImpersonate}
                  disabled={!!impersonating}
                  className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  {impersonating ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                  Impersonate
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-900">
                {([
                  { id: 'issues', label: 'Active Issues' },
                  { id: 'impersonation', label: 'Impersonation Log' },
                  { id: 'integrations', label: 'Integration Status' },
                ] as { id: SupportTab; label: string }[]).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer shrink-0 ${
                      tab === t.id
                        ? 'border-white text-white'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {t.label}
                    {t.id === 'issues' && supportData && supportData.alerts.length > 0 && (
                      <span className="ml-1.5 text-[9px] bg-red-900/40 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded">
                        {supportData.alerts.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
                {loadingData ? (
                  <div className="py-16 flex items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
                    <Loader2 className="size-4 animate-spin text-zinc-400" />
                    Loading...
                  </div>
                ) : !supportData ? (
                  <div className="py-16 text-center text-zinc-600 text-xs font-mono">Failed to load data</div>
                ) : (
                  <>
                    {/* Active Issues */}
                    {tab === 'issues' && (
                      <div>
                        {supportData.alerts.length === 0 ? (
                          <div className="py-16 flex flex-col items-center gap-2 text-center">
                            <CheckCircle2 className="size-8 text-zinc-700" />
                            <p className="text-zinc-500 text-xs font-mono">No active issues for this company</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-900">
                            {supportData.alerts.map(alert => (
                              <div key={alert.id} className="px-4 py-3 flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      alert.severity === 'critical' ? 'bg-red-400'
                                      : alert.severity === 'warning' ? 'bg-amber-400'
                                      : 'bg-blue-400'
                                    }`} />
                                    <span className="text-xs font-semibold text-zinc-200">{alert.title}</span>
                                  </div>
                                  {alert.description && (
                                    <p className="text-[11px] text-zinc-500 font-mono">{alert.description}</p>
                                  )}
                                  <p className="text-[10px] text-zinc-600 font-mono">
                                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                                <button
                                  onClick={() => resolveAlert(alert.id)}
                                  disabled={resolving === alert.id}
                                  className="text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                                >
                                  {resolving === alert.id ? 'Resolving...' : 'Resolve'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Impersonation Log */}
                    {tab === 'impersonation' && (
                      <div>
                        {supportData.impersonations.length === 0 ? (
                          <div className="py-16 text-center text-zinc-600 text-xs font-mono">
                            No impersonation sessions recorded
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-900 bg-zinc-900/10">
                                <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Super Admin</th>
                                <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {supportData.impersonations.map(imp => (
                                <tr key={imp.id} className="hover:bg-zinc-900/10 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="text-xs font-semibold text-zinc-200">{imp.admin_name ?? 'Super Admin'}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono">{imp.admin_email}</p>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-zinc-500 font-mono whitespace-nowrap">
                                    {formatDistanceToNow(new Date(imp.started_at), { addSuffix: true })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* Integration Status */}
                    {tab === 'integrations' && (
                      <div>
                        {supportData.integrations.length === 0 ? (
                          <div className="py-16 text-center text-zinc-600 text-xs font-mono">
                            No integrations configured for this company
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-900 bg-zinc-900/10">
                                <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Integration</th>
                                <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Last Tested</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {supportData.integrations.map(intg => (
                                <tr key={intg.id} className="hover:bg-zinc-900/10 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="text-xs font-semibold text-zinc-200 capitalize">{intg.type}</p>
                                    {intg.error_message && (
                                      <p className="text-[10px] text-red-400 font-mono mt-0.5">{intg.error_message}</p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                      intg.status === 'active' || intg.is_active
                                        ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                                        : intg.status === 'error'
                                        ? 'text-red-400 border-red-500/20 bg-red-500/10'
                                        : 'text-zinc-400 border-zinc-800 bg-zinc-900'
                                    }`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                      {intg.status === 'active' || intg.is_active ? 'Connected' : intg.status === 'error' ? 'Error' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-[10px] text-zinc-500 font-mono">
                                    {intg.last_tested_at
                                      ? formatDistanceToNow(new Date(intg.last_tested_at), { addSuffix: true })
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
