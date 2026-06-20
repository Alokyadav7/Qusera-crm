'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Building2, Users, MoreHorizontal, RefreshCw,
  Download, Play, Pause, Trash2, Mail, Eye, Calendar, Shield,
  TrendingUp, Activity, AlertTriangle, Edit2
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { EditCompanyModal, DeleteModal } from '@/components/super-admin/company-crud-panel'

type FilterStatus = 'all' | 'active' | 'trial' | 'suspended'

interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  status: string
  plan_id: string | null
  is_active: boolean
  created_at: string
  setup_complete: boolean
  member_count?: number
  lead_count?: number
  mrr?: number
  admin_name?: string
  admin_email?: string
  employee_count?: string
  last_active_at?: string
  subscription?: { plan?: { display_name: string } } | null
}

const STATUS_STYLE: Record<string, string> = {
  active:    'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  trial:     'text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  suspended: 'text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  canceled:  'text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/companies')
      if (res.ok) {
        const { companies: data } = await res.json()
        setCompanies(data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    const handler = () => setOpenMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const getHealthScore = (c: Company): { label: 'Healthy' | 'Warning' | 'Critical'; cls: string } => {
    if (c.status === 'suspended') return { label: 'Critical', cls: 'text-red-400 border-red-500/25 bg-red-500/10' }
    if (!c.setup_complete) return { label: 'Warning', cls: 'text-amber-400 border-amber-500/25 bg-amber-500/10' }
    if ((c.member_count ?? 0) === 0) return { label: 'Critical', cls: 'text-red-400 border-red-500/25 bg-red-500/10' }
    if ((c.member_count ?? 0) === 1) return { label: 'Warning', cls: 'text-amber-400 border-amber-500/25 bg-amber-500/10' }
    return { label: 'Healthy', cls: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10' }
  }

  const filtered = companies.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.slug ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.admin_email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && c.is_active && c.status !== 'suspended') ||
      (filter === 'suspended' && c.status === 'suspended') ||
      (filter === 'trial' && c.status === 'trial')
    return matchSearch && matchFilter
  })

  async function handleAction(action: string, companyId: string, companyName: string) {
    setActingOn(companyId)
    setOpenMenu(null)
    try {
      if (action === 'view') {
        const res = await fetch('/api/super-admin/impersonate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            reason: `Super Admin access to ${companyName} from Companies List`,
          }),
        })
        if (res.ok) {
          toast.success(`Now viewing as ${companyName}`)
          window.location.href = '/dashboard'
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to impersonate')
        }
        return
      }

      if (action === 'resend') {
        const res = await fetch('/api/super-admin/companies/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId }),
        })
        if (res.ok) toast.success(`Onboarding email resent to ${companyName} admin`)
        else {
          const err = await res.json()
          toast.error(err.error || 'Failed to resend')
        }
        return
      }

      const res = await fetch(`/api/super-admin/companies/${companyId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        const msgs: Record<string, string> = {
          suspend: `${companyName} suspended`,
          activate: `${companyName} activated`,
          delete: `${companyName} soft-deleted`,
        }
        toast.success(msgs[action] ?? 'Done')
        fetchCompanies()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Action failed')
      }
    } finally {
      setActingOn(null)
    }
  }

  function exportCSV() {
    const headers = ['Company Name', 'Health', 'Admin Email', 'Plan', 'Status', 'MRR', 'Usage', 'Onboarded']
    const rows = filtered.map(c => {
      const h = getHealthScore(c)
      return [
        c.name,
        h.label,
        c.admin_email ?? '',
        c.subscription?.plan?.display_name ?? c.plan_id ?? 'Free',
        c.status,
        c.mrr ?? 0,
        c.lead_count ?? 0,
        new Date(c.created_at).toLocaleDateString('en-IN'),
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'trial', label: 'Trial' },
    { value: 'suspended', label: 'Suspended' },
  ]

  // Computed stats
  const totalCompanies = companies.length
  const activeCount = companies.filter(c => c.is_active && c.status !== 'suspended').length
  const trialCount = companies.filter(c => c.status === 'trial').length
  const suspendedCount = companies.filter(c => c.status === 'suspended').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto bg-zinc-950 min-h-screen text-zinc-100 font-mono">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-2 select-none">
            <Shield className="size-3" />
            <span>Corporate Instances</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Tenant Companies</h1>
          <p className="text-zinc-500 text-xs mt-1 font-sans">
            Configure system states, isolate resources, track health indicators, and impersonate workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 select-none">
          <button
            onClick={fetchCompanies}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 text-zinc-450 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[11px] font-bold px-3 py-2 rounded transition-all cursor-pointer"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <Link
            href="/super-admin/onboard-company"
            className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-100 text-zinc-950 text-[11px] font-bold px-3.5 py-2 rounded transition-all whitespace-nowrap"
          >
            <Plus className="size-3.5" />
            <span>Onboard Tenant</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 select-none">
        {[
          { label: 'Total Tenants', value: totalCompanies, icon: Building2, color: 'text-zinc-350', border: 'border-zinc-800 bg-zinc-950' },
          { label: 'Active sites', value: activeCount, icon: TrendingUp, color: 'text-emerald-400', border: 'border-zinc-800 bg-zinc-950' },
          { label: 'In Trial', value: trialCount, icon: Activity, color: 'text-amber-400', border: 'border-zinc-800 bg-zinc-950' },
          { label: 'Suspended', value: suspendedCount, icon: AlertTriangle, color: 'text-red-400', border: 'border-zinc-800 bg-zinc-950' },
        ].map(stat => (
          <div key={stat.label} className={`flex items-center gap-3.5 px-4 py-3.5 rounded border ${stat.border}`}>
            <stat.icon className={`size-4.5 shrink-0 ${stat.color}`} />
            <div>
              <p className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider leading-none mb-1.5">{stat.label}</p>
              <p className={`text-lg font-black leading-none ${stat.color}`}>{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by name, slug or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded w-full sm:w-auto select-none">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-colors cursor-pointer ${
                filter === f.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <p className="text-zinc-600 text-xs ml-auto shrink-0 select-none">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Main Companies Table / Cards Wrapper */}
      <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-600 text-xs gap-2">
            <RefreshCw className="size-3.5 animate-spin text-zinc-500" />
            <span>Accessing cluster registry...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <Building2 className="size-10 text-zinc-800 mb-1" />
            <p className="text-zinc-500 text-xs font-bold uppercase">No matching environments</p>
            <p className="text-zinc-650 text-[11px] font-sans">
              {search || filter !== 'all'
                ? 'Adjust your query criteria or filters.'
                : 'No active workspaces are registered on the node.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Viewport Table (>=640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-900/25 text-[9px] font-bold text-zinc-550 tracking-widest uppercase select-none">
                    <th className="px-5 py-3">Company Target</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Health Status</th>
                    <th className="px-5 py-3">Users</th>
                    <th className="px-5 py-3 hidden lg:table-cell">MRR Pacing</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Usage (Leads)</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Last Active</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filtered.map(company => {
                    const health = getHealthScore(company)
                    return (
                      <tr key={company.id} className="hover:bg-zinc-900/10 transition-colors group">
                        
                        {/* Company profile & admin */}
                        <td className="px-5 py-3.5">
                          <p className="text-zinc-200 text-xs font-bold">{company.name}</p>
                          <p className="text-zinc-650 text-[10px] font-mono mt-0.5">{company.slug} · {company.admin_email}</p>
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-zinc-900 text-zinc-450 border border-zinc-800 select-none">
                            {company.subscription?.plan?.display_name ?? company.plan_id ?? 'Free'}
                          </span>
                        </td>

                        {/* Health status */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${health.cls}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {health.label}
                          </span>
                        </td>

                        {/* Users */}
                        <td className="px-5 py-3.5 text-zinc-300 text-xs font-mono font-medium">
                          {company.member_count ?? 0} nodes
                        </td>

                        {/* MRR (hidden on tablet) */}
                        <td className="px-5 py-3.5 hidden lg:table-cell text-zinc-300 text-xs font-mono font-medium">
                          ₹{(company.mrr ?? 0).toLocaleString('en-IN')}
                        </td>

                        {/* Usage (Leads) (hidden on tablet) */}
                        <td className="px-5 py-3.5 hidden lg:table-cell text-zinc-400 text-xs font-mono">
                          {company.lead_count ?? 0} leads
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 select-none">
                          <span className={STATUS_STYLE[company.status] ?? STATUS_STYLE.trial}>
                            {company.status}
                          </span>
                        </td>

                        {/* Last active (hidden on tablet) */}
                        <td className="px-5 py-3.5 hidden lg:table-cell text-zinc-550 text-[10px] font-mono">
                          {company.last_active_at
                            ? formatDistanceToNow(new Date(company.last_active_at), { addSuffix: true })
                            : '—'}
                        </td>

                        {/* Actions dropdown */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 relative">
                            <button
                              onClick={() => handleAction('view', company.id, company.name)}
                              disabled={actingOn === company.id}
                              title="Impersonate workspace"
                              className="text-zinc-500 hover:text-white hover:bg-zinc-900 p-1.5 rounded border border-transparent hover:border-zinc-800 transition-all cursor-pointer disabled:opacity-40"
                            >
                              <Eye className="size-3.5" />
                            </button>

                            <div className="relative">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setOpenMenu(openMenu === company.id ? null : company.id)
                                }}
                                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors cursor-pointer"
                              >
                                <MoreHorizontal className="size-3.5" />
                              </button>

                              {openMenu === company.id && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className="absolute right-0 top-8 z-50 w-44 bg-zinc-950 border border-zinc-850 rounded shadow-2xl py-1 text-xs text-left"
                                >
                                  {company.status !== 'suspended' ? (
                                    <button
                                      onClick={() => handleAction('suspend', company.id, company.name)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-amber-400 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                                    >
                                      <Pause className="size-3" /> Suspend Space
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleAction('activate', company.id, company.name)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-emerald-450 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                                    >
                                      <Play className="size-3" /> Activate Space
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleAction('resend', company.id, company.name)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                                  >
                                    <Mail className="size-3" /> Resend Invite
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCompany(company)
                                      setOpenMenu(null)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                                  >
                                    <Edit2 className="size-3" /> Edit Details
                                  </button>
                                  <hr className="border-zinc-900 my-1" />
                                  <button
                                    onClick={() => {
                                      setDeletingCompany(company)
                                      setOpenMenu(null)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                                  >
                                    <Trash2 className="size-3" /> Delete Tenant
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Viewport Card List (<640px) */}
            <div className="sm:hidden p-3.5 space-y-4">
              {filtered.map(company => {
                const health = getHealthScore(company)
                return (
                  <div key={company.id} className="bg-zinc-950 border border-zinc-800 rounded p-4 space-y-4">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{company.name}</p>
                        <p className="text-[10px] text-zinc-550 font-mono mt-0.5">{company.slug}</p>
                      </div>
                      <span className={STATUS_STYLE[company.status] ?? STATUS_STYLE.trial}>
                        {company.status}
                      </span>
                    </div>

                    {/* Stats details */}
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-zinc-500">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-650">Plan tier</span>
                        <p className="text-zinc-350 mt-0.5">{company.subscription?.plan?.display_name ?? company.plan_id ?? 'Free'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-650">MRR Pacing</span>
                        <p className="text-zinc-350 mt-0.5">₹{(company.mrr ?? 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-650">Health status</span>
                        <p className="text-zinc-350 mt-0.5">{health.label}</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-650">Users</span>
                        <p className="text-zinc-350 mt-0.5">{company.member_count ?? 0} active</p>
                      </div>
                    </div>

                    {/* Mobile touch-optimized buttons (min 44px) */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleAction('view', company.id, company.name)}
                        disabled={actingOn === company.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-350 text-xs font-bold h-11 rounded hover:bg-zinc-850 active:bg-zinc-800 transition-colors"
                      >
                        <Eye className="size-4" />
                        <span>Impersonate</span>
                      </button>

                      <div className="relative">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setOpenMenu(openMenu === company.id ? null : company.id)
                          }}
                          className="w-11 h-11 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-350 rounded hover:bg-zinc-850 active:bg-zinc-850 transition-colors"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>

                        {openMenu === company.id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className="absolute right-0 bottom-12 z-50 w-48 bg-zinc-950 border border-zinc-850 rounded shadow-2xl py-1.5 text-xs text-left"
                          >
                            {company.status !== 'suspended' ? (
                              <button
                                onClick={() => handleAction('suspend', company.id, company.name)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-amber-400 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                              >
                                <Pause className="size-3.5" /> Suspend Workspace
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction('activate', company.id, company.name)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                              >
                                <Play className="size-3.5" /> Activate Workspace
                              </button>
                            )}
                            <button
                              onClick={() => handleAction('resend', company.id, company.name)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                            >
                              <Mail className="size-3.5" /> Resend Onboarding
                            </button>
                            <button
                              onClick={() => {
                                setEditingCompany(company)
                                setOpenMenu(null)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer text-left"
                            >
                              <Edit2 className="size-3.5" /> Edit Details
                            </button>
                            <hr className="border-zinc-900 my-1" />
                            <button
                              onClick={() => {
                                setDeletingCompany(company)
                                setOpenMenu(null)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                            >
                              <Trash2 className="size-3.5" /> Delete Workspace
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {editingCompany && (
        <EditCompanyModal
          company={editingCompany as any}
          onClose={() => setEditingCompany(null)}
          onSaved={() => {
            setEditingCompany(null)
            fetchCompanies()
          }}
        />
      )}

      {deletingCompany && (
        <DeleteModal
          company={deletingCompany as any}
          onClose={() => setDeletingCompany(null)}
          onDeleted={() => {
            setDeletingCompany(null)
            fetchCompanies()
          }}
        />
      )}

    </div>
  )
}
