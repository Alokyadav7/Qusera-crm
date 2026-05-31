'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Download, Users, Calendar, Building2,
  Mail, Phone, MessageSquare, ChevronDown, CheckCircle2,
  Clock, XCircle, Sparkles, Filter
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

type Status = 'all' | 'pending' | 'contacted' | 'converted' | 'rejected'
type Intent = 'all' | 'demo' | 'trial' | 'contact'

interface DemoRequest {
  id: string
  name: string
  email: string
  phone: string | null
  company_name: string | null
  team_size: string | null
  intent: string
  message: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pending',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/25',   icon: Clock },
  contacted: { label: 'Contacted', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25',      icon: Mail },
  converted: { label: 'Converted', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  color: 'text-red-400 bg-red-500/10 border-red-500/25',         icon: XCircle },
}

export default function DemoRequestsPage() {
  const [requests, setRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<Status>('all')
  const [intentFilter, setIntentFilter] = useState<Intent>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (intentFilter !== 'all') params.set('intent', intentFilter)
      const res = await fetch(`/api/super-admin/demo-requests?${params}`)
      if (res.ok) {
        const { requests: data } = await res.json()
        setRequests(data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, intentFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function updateStatus(id: string, status: string) {
    setSavingId(id)
    try {
      const notes = editNotes[id]
      const res = await fetch('/api/super-admin/demo-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, ...(notes !== undefined ? { notes } : {}) }),
      })
      if (res.ok) {
        toast.success(`Marked as ${status}`)
        fetchRequests()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update')
      }
    } finally {
      setSavingId(null)
    }
  }

  async function saveNotes(id: string) {
    setSavingId(id)
    try {
      const res = await fetch('/api/super-admin/demo-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: editNotes[id] ?? '' }),
      })
      if (res.ok) {
        toast.success('Notes saved')
        fetchRequests()
      }
    } finally {
      setSavingId(null)
    }
  }

  function exportCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Team Size', 'Intent', 'Status', 'Message', 'Submitted']
    const rows = requests.map(r => [
      r.name, r.email, r.phone ?? '', r.company_name ?? '',
      r.team_size ?? '', r.intent, r.status, r.message ?? '',
      format(new Date(r.created_at), 'dd MMM yyyy HH:mm'),
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `demo-requests-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  // Stats
  const total = requests.length
  const pending = requests.filter(r => r.status === 'pending').length
  const converted = requests.filter(r => r.status === 'converted').length
  const demoCount = requests.filter(r => r.intent === 'demo').length
  const trialCount = requests.filter(r => r.intent === 'trial').length
  const contactCount = requests.filter(r => r.intent === 'contact').length

  const STATUS_FILTERS: { value: Status; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'converted', label: 'Converted' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="p-4 sm:p-6 xl:p-10 space-y-5 sm:space-y-6 max-w-[1400px] bg-black min-h-screen text-zinc-100">

      {/* ── Header ─────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-2">
            <Sparkles className="size-3" />
            Lead Pipeline
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Demo Requests</h1>
          <p className="text-zinc-500 text-xs mt-1">
            All OTP-verified demo &amp; trial requests from the landing page.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-all cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold px-3 py-2 rounded transition-all cursor-pointer"
          >
            <Download className="size-3.5" />
            <span className="hidden xs:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Requests', value: total, color: 'text-zinc-200', border: 'border-zinc-800 bg-zinc-900' },
          { label: 'Pending', value: pending, color: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/5' },
          { label: 'Converted', value: converted, color: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5' },
          { label: 'Demo', value: demoCount, color: 'text-blue-400', border: 'border-blue-500/20 bg-blue-500/5' },
          { label: 'Trial', value: trialCount, color: 'text-violet-400', border: 'border-violet-500/20 bg-violet-500/5' },
          { label: 'Contact Form', value: contactCount, color: 'text-orange-400', border: 'border-orange-500/20 bg-orange-500/5' },
        ].map(s => (
          <div key={s.label} className={`px-4 py-3 rounded border ${s.border} flex flex-col`}>
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────── */}
      <div className="flex flex-col gap-2">
        <div className="overflow-x-auto pb-1">
          <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded w-max min-w-full sm:min-w-0">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold rounded transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === f.value ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="overflow-x-auto pb-1 flex-1">
            <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded w-max">
              {(['all', 'demo', 'trial', 'contact'] as Intent[]).map(i => (
                <button
                  key={i}
                  onClick={() => setIntentFilter(i)}
                  className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold rounded transition-colors cursor-pointer capitalize whitespace-nowrap ${
                    intentFilter === i ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {i === 'all' ? 'All' : i === 'demo' ? '📅 Demo' : i === 'trial' ? '🚀 Trial' : '📧 Contact'}
                </button>
              ))}
            </div>
          </div>
          {!loading && (
            <p className="text-zinc-600 text-xs shrink-0">{requests.length} result{requests.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* ── Requests List ────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-500 text-xs gap-2">
          <RefreshCw className="size-3.5 animate-spin" />
          <span>Loading requests…</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-3 text-center border border-zinc-900 rounded bg-zinc-950">
          <Users className="size-10 text-zinc-700" />
          <p className="text-zinc-400 text-xs font-bold">No demo requests yet</p>
          <p className="text-zinc-600 text-[11px]">
            Once visitors fill the landing page form, their verified requests appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => {
            const s = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
            const isExpanded = expandedId === req.id
            const StatusIcon = s.icon

            return (
              <div key={req.id} className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
                {/* Row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-900/20 transition-colors"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : req.id)
                    if (!isExpanded && editNotes[req.id] === undefined) {
                      setEditNotes(n => ({ ...n, [req.id]: req.notes ?? '' }))
                    }
                  }}
                >
                  {/* Left: Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${s.color}`}>
                        <StatusIcon className="size-2.5" />
                        {s.label}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        req.intent === 'trial'
                          ? 'text-violet-400 bg-violet-500/10 border-violet-500/25'
                          : req.intent === 'contact'
                          ? 'text-orange-400 bg-orange-500/10 border-orange-500/25'
                          : 'text-blue-400 bg-blue-500/10 border-blue-500/25'
                      }`}>
                        {req.intent === 'trial' ? '🚀 Trial' : req.intent === 'contact' ? '📧 Contact' : '📅 Demo'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-zinc-100">{req.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{req.email}</p>
                  </div>

                  {/* Middle: Company + Team */}
                  <div className="hidden md:block text-right shrink-0">
                    {req.company_name && (
                      <p className="text-xs font-semibold text-zinc-300">{req.company_name}</p>
                    )}
                    {req.team_size && (
                      <p className="text-[10px] text-zinc-500">{req.team_size} people</p>
                    )}
                  </div>

                  {/* Right: Date + Expand */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronDown className={`size-4 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-900 px-5 py-5 space-y-5 bg-zinc-900/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Contact Info */}
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Contact</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <Mail className="size-3.5 text-zinc-600 shrink-0" />
                          <a href={`mailto:${req.email}`} className="hover:text-white transition-colors truncate">{req.email}</a>
                        </div>
                        {req.phone && (
                          <div className="flex items-center gap-2 text-xs text-zinc-300">
                            <Phone className="size-3.5 text-zinc-600 shrink-0" />
                            <span>{req.phone}</span>
                          </div>
                        )}
                        {req.company_name && (
                          <div className="flex items-center gap-2 text-xs text-zinc-300">
                            <Building2 className="size-3.5 text-zinc-600 shrink-0" />
                            <span>{req.company_name}</span>
                          </div>
                        )}
                        {req.team_size && (
                          <div className="flex items-center gap-2 text-xs text-zinc-300">
                            <Users className="size-3.5 text-zinc-600 shrink-0" />
                            <span>{req.team_size} people</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Calendar className="size-3.5 text-zinc-700 shrink-0" />
                          <span>{format(new Date(req.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Their Message</p>
                        {req.message ? (
                          <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900 border border-zinc-800 rounded p-3">
                            {req.message}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-600 italic">No message provided.</p>
                        )}
                      </div>

                      {/* Internal Notes */}
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Internal Notes</p>
                        <textarea
                          value={editNotes[req.id] ?? req.notes ?? ''}
                          onChange={e => setEditNotes(n => ({ ...n, [req.id]: e.target.value }))}
                          placeholder="Add internal notes about this lead..."
                          rows={4}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors resize-none"
                        />
                        <button
                          onClick={() => saveNotes(req.id)}
                          disabled={savingId === req.id}
                          className="text-[10px] font-semibold text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {savingId === req.id ? 'Saving…' : 'Save Notes'}
                        </button>
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900">
                      <p className="text-[10px] font-semibold text-zinc-600 mr-1">Move to:</p>
                      {['pending', 'contacted', 'converted', 'rejected'].filter(s => s !== req.status).map(status => {
                        const cfg = STATUS_CONFIG[status]
                        return (
                          <button
                            key={status}
                            onClick={() => updateStatus(req.id, status)}
                            disabled={savingId === req.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded border transition-all cursor-pointer disabled:opacity-50 ${cfg.color}`}
                          >
                            <cfg.icon className="size-3" />
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
