'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, StatusBadge } from '@/components/super-admin/ui'
import {
  Search, Plus, Building2, Users, MoreHorizontal, RefreshCw,
  Download, Play, Pause, Trash2, Mail, Eye, Calendar, Shield
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
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
  subscription?: { plan?: { display_name: string } } | null
}

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
  trial:     'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
  canceled:  'bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
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
    const headers = ['Company Name', 'Admin Email', 'Plan', 'Status', 'Employees', 'Onboarded']
    const rows = filtered.map(c => [
      c.name,
      c.admin_email ?? '',
      c.subscription?.plan?.display_name ?? c.plan_id ?? 'Free',
      c.status,
      c.employee_count ?? '',
      new Date(c.created_at).toLocaleDateString('en-IN'),
    ])
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
    <div className="p-8 xl:p-12 space-y-8 max-w-[1500px] relative overflow-hidden">
      {/* Ambient background blur */}
      <div className="absolute right-[5%] top-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.02] blur-[140px] pointer-events-none" />
      <div className="absolute left-[15%] bottom-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/[0.01] blur-[160px] pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            <Shield className="size-3 text-violet-400" />
            <span>Corporate Instances</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight font-display">
            Tenant Companies
          </h1>
          <p className="text-zinc-500 text-xs mt-1 font-sans">
            Configure system states, isolate resources, and impersonate or suspend workspaces
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCompanies}
            className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-xl transition-all cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
          <Link
            href="/super-admin/onboard-company"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-black/10 cursor-pointer"
          >
            <Plus className="size-3.5" />
            New Company
          </Link>
        </div>
      </div>

      {/* Filters & Search Control */}
      <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search by name, slug or admin email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900/40 border border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:ring-2 focus:ring-white/[0.04] focus:border-zinc-700 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-900/80 rounded-xl w-full sm:w-auto">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === f.value
                  ? 'bg-zinc-900 text-white border border-zinc-800/80 shadow-inner'
                  : 'text-zinc-450 hover:text-zinc-200 hover:bg-white/[0.01] border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Companies Glass Card Panel */}
      <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500 text-sm gap-2">
            <RefreshCw className="size-4 animate-spin text-violet-400" />
            <span>Fetching company clusters...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <Building2 className="size-12 text-zinc-600 opacity-60 mb-2" />
            <p className="text-zinc-400 text-sm font-bold">No instances found</p>
            <p className="text-zinc-600 text-xs max-w-xs leading-relaxed">Adjust filters or create a new corporate container above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/20 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                  <th className="px-6 py-4">Company Profile</th>
                  <th className="px-6 py-4">Admin Owner</th>
                  <th className="px-6 py-4">Members</th>
                  <th className="px-6 py-4">Tier Plan</th>
                  <th className="px-6 py-4">System State</th>
                  <th className="px-6 py-4">Onboarded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map(company => (
                  <tr key={company.id} className="hover:bg-white/[0.01] transition-colors group">
                    {/* Profile */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                          {company.logo_url ? (
                            <img src={company.logo_url} alt="" className="size-6 rounded object-cover" />
                          ) : (
                            <Building2 className="size-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                          )}
                        </div>
                        <div>
                          <p className="text-zinc-200 text-sm font-bold group-hover:text-white transition-colors">{company.name}</p>
                          <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{company.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Admin Owner */}
                    <td className="px-6 py-4.5">
                      <p className="text-zinc-300 text-xs font-semibold">{company.admin_name ?? '—'}</p>
                      <p className="text-zinc-550 text-[11px] font-mono mt-0.5">{company.admin_email ?? '—'}</p>
                    </td>

                    {/* Members Count */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Users className="size-4 text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-300">{company.member_count ?? 0}</span>
                      </div>
                      {company.employee_count && (
                        <p className="text-zinc-500 text-[10px] mt-0.5 font-sans font-light">{company.employee_count}</p>
                      )}
                    </td>

                    {/* Tier Plan */}
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-violet-500/5 text-violet-400 border border-violet-500/10">
                        {company.subscription?.plan?.display_name ?? company.plan_id ?? 'Free'}
                      </span>
                    </td>

                    {/* System State */}
                    <td className="px-6 py-4.5">
                      <span className={STATUS_STYLE[company.status ?? 'trial'] ?? STATUS_STYLE.trial}>
                        {company.status ?? 'trial'}
                      </span>
                    </td>

                    {/* Onboarded Date */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-1.5 text-zinc-550 text-xs font-mono">
                        <Calendar className="size-3.5" />
                        <span>
                          {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </td>

                    {/* Actions Panel */}
                    <td className="px-6 py-4.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 relative">
                        <button
                          onClick={() => handleAction('view', company.id, company.name)}
                          disabled={actingOn === company.id}
                          title="Impersonate and view company space"
                          className="text-xs text-zinc-450 hover:text-white hover:bg-zinc-800/80 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-zinc-700/60 transition-all font-semibold cursor-pointer"
                        >
                          <Eye className="size-4" />
                        </button>

                        <div className="relative">
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === company.id ? null : company.id) }}
                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-all cursor-pointer"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>

                          {openMenu === company.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-7 z-50 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1 text-xs text-left animate-fade-in"
                            >
                              {company.status !== 'suspended' ? (
                                <button
                                  onClick={() => handleAction('suspend', company.id, company.name)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-amber-400 hover:bg-white/[0.02] transition-colors cursor-pointer"
                                >
                                  <Pause className="size-3.5" />Suspend Space
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAction('activate', company.id, company.name)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-emerald-400 hover:bg-white/[0.02] transition-colors cursor-pointer"
                                >
                                  <Play className="size-3.5" />Activate Space
                                </button>
                              )}
                              <button
                                onClick={() => handleAction('resend', company.id, company.name)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-zinc-350 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
                              >
                                <Mail className="size-3.5" />Resend Invite
                              </button>
                              <hr className="border-zinc-800 my-1" />
                              <button
                                onClick={() => {
                                  if (confirm(`Soft delete ${company.name}? Retention active for 30 days.`)) {
                                    handleAction('delete', company.id, company.name)
                                  }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />Delete Tenant
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
