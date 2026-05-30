'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Building2, Users, MoreHorizontal, RefreshCw,
  Download, Play, Pause, Trash2, Mail, Eye, Calendar, Shield, HeartPulse
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

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
  admin_name?: string
  admin_email?: string
  employee_count?: string
  last_active_at?: string
  subscription?: { plan?: { display_name: string } } | null
}

const STATUS_STYLE: Record<string, string> = {
  active:    'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  trial:     'text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  suspended: 'text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  canceled:  'text-zinc-550 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

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

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  useEffect(() => {
    const handler = () => setOpenMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const getHealthScore = (c: Company): { label: 'Healthy' | 'Warning' | 'Critical'; cls: string } => {
    if (c.status === 'suspended') return { label: 'Critical', cls: 'text-red-400 border-red-500/20 bg-red-500/10' }
    if (!c.setup_complete) return { label: 'Warning', cls: 'text-amber-400 border-amber-500/20 bg-amber-500/10' }
    if ((c.member_count ?? 0) === 0) return { label: 'Critical', cls: 'text-red-400 border-red-500/20 bg-red-500/10' }
    if ((c.member_count ?? 0) === 1) return { label: 'Warning', cls: 'text-amber-400 border-amber-500/20 bg-amber-500/10' }
    return { label: 'Healthy', cls: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' }
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
        const res = await fetch('/api/admin/impersonate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId }),
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
        else { const err = await res.json(); toast.error(err.error || 'Failed to resend') }
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
    const headers = ['Company Name', 'Health', 'Admin Email', 'Plan', 'Status', 'Employees', 'Onboarded']
    const rows = filtered.map(c => {
      const h = getHealthScore(c)
      return [
        c.name,
        h.label,
        c.admin_email ?? '',
        c.subscription?.plan?.display_name ?? c.plan_id ?? 'Free',
        c.status,
        c.employee_count ?? '',
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
    { value: 'all', label: 'All Slots' },
    { value: 'active', label: 'Active' },
    { value: 'trial', label: 'In Trial' },
    { value: 'suspended', label: 'Suspended' },
  ]

  return (
    <div className="p-6 xl:p-10 space-y-6 max-w-[1600px] bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2 select-none">
            <Shield className="size-3 text-zinc-350" />
            <span>Corporate Instances</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-display select-none">
            Tenant Companies
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Configure system states, isolate resources, track health indicators and impersonate workspaces
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCompanies}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 rounded transition-all cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white bg-zinc-955 hover:bg-zinc-900 border border-zinc-900 text-[11px] font-bold px-3 py-2 rounded transition-all cursor-pointer"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
          <Link
            href="/super-admin/onboard-company"
            className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-955 text-[11px] font-bold px-3.5 py-2 rounded transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            Onboard Company
          </Link>
        </div>
      </div>

      {/* Filters & Search Control */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-550 group-focus-within:text-zinc-300 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, slug or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-1 p-0.5 bg-zinc-950 border border-zinc-900 rounded w-full sm:w-auto">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 sm:flex-initial px-3 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                filter === f.value
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Companies Table-First Design */}
      <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500 text-xs font-mono gap-2">
            <RefreshCw className="size-3.5 animate-spin text-zinc-400" />
            <span>Fetching company clusters...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <Building2 className="size-10 text-zinc-600 opacity-60 mb-1" />
            <p className="text-zinc-400 text-xs font-bold font-mono">No instances found</p>
            <p className="text-zinc-650 text-[11px]">Adjust filters or onboard a new corporate container.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/5 text-[9px] font-bold text-zinc-550 tracking-wider uppercase">
                  <th className="px-5 py-3">Company Profile</th>
                  <th className="px-5 py-3">Health Score</th>
                  <th className="px-5 py-3">Admin Owner</th>
                  <th className="px-5 py-3">Members</th>
                  <th className="px-5 py-3">Tier Plan</th>
                  <th className="px-5 py-3">System State</th>
                  <th className="px-5 py-3">Onboarded</th>
                  <th className="px-5 py-3">Last Active</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filtered.map(company => {
                  const health = getHealthScore(company)
                  return (
                    <tr key={company.id} className="hover:bg-zinc-900/10 transition-colors group">
                      {/* Profile */}
                      <td className="px-5 py-3.5">
                        <Link href={`/super-admin/companies/${company.id}`} className="text-zinc-200 text-xs font-bold hover:text-white transition-colors">
                          {company.name}
                        </Link>
                        <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{company.slug}</p>
                      </td>

                      {/* Health Score */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${health.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {health.label}
                        </span>
                      </td>

                      {/* Admin Owner */}
                      <td className="px-5 py-3.5">
                        <p className="text-zinc-300 text-xs font-semibold">{company.admin_name ?? '—'}</p>
                        <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{company.admin_email ?? '—'}</p>
                      </td>

                      {/* Members Count */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Users className="size-3.5 text-zinc-550" />
                          <span className="text-xs font-bold text-zinc-300">{company.member_count ?? 0}</span>
                        </div>
                      </td>

                      {/* Tier Plan */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-zinc-900 text-zinc-400 border border-zinc-800 select-none">
                          {company.subscription?.plan?.display_name ?? company.plan_id ?? 'Free'}
                        </span>
                      </td>

                      {/* System State */}
                      <td className="px-5 py-3.5">
                        <span className={STATUS_STYLE[company.status ?? 'trial'] ?? STATUS_STYLE.trial}>
                          {company.status ?? 'trial'}
                        </span>
                      </td>

                      {/* Onboarded Date */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-mono">
                          <Calendar className="size-3 text-zinc-650" />
                          <span>
                            {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="px-5 py-3.5 text-zinc-500 text-xs font-mono">
                        {company.last_active_at ? (
                          formatDistanceToNow(new Date(company.last_active_at), { addSuffix: true })
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Actions Panel */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          <button
                            onClick={() => handleAction('view', company.id, company.name)}
                            disabled={actingOn === company.id}
                            title="Impersonate and view company space"
                            className="text-zinc-450 hover:text-white hover:bg-zinc-900 p-1.5 rounded border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          <div className="relative">
                            <button
                              onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === company.id ? null : company.id) }}
                              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </button>

                            {openMenu === company.id && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-7 z-50 w-44 bg-zinc-950 border border-zinc-900 rounded shadow-xl py-1 text-xs text-left animate-fade-in"
                              >
                                {company.status !== 'suspended' ? (
                                  <button
                                    onClick={() => handleAction('suspend', company.id, company.name)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-amber-500 hover:bg-zinc-900 transition-colors cursor-pointer"
                                  >
                                    <Pause className="size-3" />Suspend Space
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAction('activate', company.id, company.name)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-emerald-500 hover:bg-zinc-900 transition-colors cursor-pointer"
                                  >
                                    <Play className="size-3" />Activate Space
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction('resend', company.id, company.name)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
                                >
                                  <Mail className="size-3" />Resend Invite
                                </button>
                                <hr className="border-zinc-900 my-1" />
                                <button
                                  onClick={() => {
                                    if (confirm(`Soft delete ${company.name}? Retention active for 30 days.`)) {
                                      handleAction('delete', company.id, company.name)
                                    }
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="size-3" />Delete Tenant
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
        )}
      </div>
    </div>
  )
}
