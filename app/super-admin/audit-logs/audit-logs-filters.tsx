'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Download, Filter, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Company { id: string; name: string }
interface Log { id: string; action: string; resource: string; details: any; created_at: string; company_id: string | null; companies: { name: string } | null }

export function AuditLogsFilters({
  companies,
  uniqueActions,
  logs,
}: {
  companies: Company[]
  uniqueActions: string[]
  logs: Log[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [company, setCompany] = useState(searchParams.get('company') ?? '')
  const [action, setAction] = useState(searchParams.get('action') ?? '')
  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')

  function applyFilters() {
    const params = new URLSearchParams()
    if (company) params.set('company', company)
    if (action) params.set('action', action)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`${pathname}?${params.toString()}`)
    toast.success('Query parameters applied')
  }

  function clearFilters() {
    setCompany(''); setAction(''); setFrom(''); setTo('')
    router.push(pathname)
    toast.success('Filter criteria cleared')
  }

  function exportCSV() {
    const headers = ['Timestamp', 'Company', 'Action', 'Resource', 'Details']
    const rows = logs.map(l => [
      new Date(l.created_at).toISOString(),
      (l.companies as any)?.name ?? l.company_id ?? 'Platform',
      l.action,
      l.resource,
      JSON.stringify(l.details).replace(/"/g, '""'),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit logs exported successfully')
  }

  const selectCls = "w-full sm:w-auto bg-zinc-950/60 border border-zinc-850 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-white/[0.04] focus:border-zinc-700 min-w-[170px] transition-all"
  const inputCls = "w-full sm:w-auto bg-zinc-950/60 border border-zinc-850 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-white/[0.04] focus:border-zinc-700 transition-all font-mono"

  return (
    <div className="flex flex-wrap items-end gap-4 bg-zinc-900/20 backdrop-blur border border-zinc-850 p-5 rounded-2xl mb-6 relative z-10">
      {/* Company filter */}
      <div className="w-full sm:w-auto">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Tenant Company</p>
        <select value={company} onChange={e => setCompany(e.target.value)} className={selectCls}>
          <option value="" className="bg-zinc-950 text-zinc-400">All Company Slots</option>
          {companies.map(c => <option key={c.id} value={c.id} className="bg-zinc-950">{c.name}</option>)}
        </select>
      </div>

      {/* Action filter */}
      <div className="w-full sm:w-auto">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Log Event Action</p>
        <select value={action} onChange={e => setAction(e.target.value)} className={selectCls}>
          <option value="" className="bg-zinc-950 text-zinc-400">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a} className="bg-zinc-950">{a}</option>)}
        </select>
      </div>

      {/* Date range */}
      <div className="w-full sm:w-auto">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">From Date</p>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
      </div>
      
      <div className="w-full sm:w-auto">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">To Date</p>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
        <button
          onClick={applyFilters}
          className="flex items-center gap-1.5 bg-white hover:bg-zinc-150 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-black/10"
        >
          <Filter className="size-3.5" />
          Apply Filters
        </button>
        
        {(company || action || from || to) && (
          <button 
            onClick={clearFilters} 
            className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs font-bold transition-colors cursor-pointer px-2 py-2"
          >
            <XCircle className="size-3.5" />
            Clear
          </button>
        )}
        
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ml-auto sm:ml-2"
        >
          <Download className="size-3.5" />
          Export CSV
        </button>
      </div>

      <div className="ml-auto text-zinc-500 text-[10px] font-mono tracking-tight self-end pb-2.5 hidden xl:block">
        {logs.length} indexed entries loaded
      </div>
    </div>
  )
}
