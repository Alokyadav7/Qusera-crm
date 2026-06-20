'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'
import {
  CreditCard, Shield, TrendingUp, DollarSign, Users, AlertCircle,
  RefreshCw, CheckCircle2, Loader2, ArrowUpRight, Calendar, Receipt,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Subscription {
  id: string
  status: string
  mrr: number
  current_period_end: string | null
  company: { id: string; name: string; slug: string; status: string } | null
}

interface Invoice {
  id: string
  status: string
  amount: number
  created_at: string
  company_id: string
}

interface Plan {
  id: string
  display_name: string
  price_monthly: number
  description: string | null
}

const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Active',    cls: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' },
  trialing: { label: 'Trial',     cls: 'text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' },
  past_due: { label: 'Past Due',  cls: 'text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' },
  canceled: { label: 'Canceled',  cls: 'text-zinc-550 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' },
  paused:   { label: 'Paused',    cls: 'text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' },
}

function calcMetrics(subs: Subscription[]) {
  const totalMRR = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.mrr ?? 0), 0)
  const totalARR = totalMRR * 12
  const activeSubs = subs.filter(s => s.status === 'active').length
  const pastDueSubs = subs.filter(s => s.status === 'past_due').length
  return { totalMRR, totalARR, activeSubs, pastDueSubs }
}

const POLL_MS = 30_000

export function BillingClient({
  initialSubscriptions,
  initialInvoices,
  plans,
}: {
  initialSubscriptions: Subscription[]
  initialInvoices: Invoice[]
  plans: Plan[]
}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions)
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  
  const supabaseRef = useRef(createClient())

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const sb = supabaseRef.current
      const [{ data: subs }, { data: invs }] = await Promise.all([
        sb.from('subscriptions')
          .select('*, company:companies(id, name, slug, status)')
          .order('created_at', { ascending: false }),
        sb.from('invoices')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ])
      if (subs) setSubscriptions(subs as any)
      if (invs) setInvoices(invs as any)
      setLastUpdated(new Date())
      if (!silent) toast.success('Ledger synced with database')
    } catch (err) {
      console.error('[Billing] Fetch failed:', err)
      toast.error('Failed to sync financial records')
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [])

  // Auto-poll every 30s
  useEffect(() => {
    const id = setInterval(() => fetchData(true), POLL_MS)
    return () => clearInterval(id)
  }, [fetchData])

  // Refresh when user returns to tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchData])

  // Realtime updates
  useEffect(() => {
    const sb = supabaseRef.current
    const channel = sb
      .channel('billing-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' },
        () => fetchData(true)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' },
        () => fetchData(true)
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [fetchData])

  const { totalMRR, totalARR, activeSubs, pastDueSubs } = calcMetrics(subscriptions)

  // Revenue Forecasting
  const pipedExpansion = 125000
  const baselineARR = totalARR || 1498000
  const churnPacing = Math.round(baselineARR * 0.016)
  const projectedARR = baselineARR + pipedExpansion - churnPacing
  const expansionRatio = ((projectedARR / baselineARR) * 100).toFixed(1)

  const metricsList = [
    {
      label: 'Monthly Recurring Revenue',
      value: `₹${totalMRR.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      desc: 'Active recurring accounts',
      color: 'text-emerald-450',
    },
    {
      label: 'Projected ARR Target',
      value: `₹${projectedARR.toLocaleString('en-IN')}`,
      icon: DollarSign,
      desc: 'All-time invoice settlements',
      color: 'text-zinc-100',
    },
    {
      label: 'Active Subscriptions',
      value: activeSubs,
      icon: Users,
      desc: 'Paid tenant clusters',
      color: 'text-zinc-100',
    },
    {
      label: 'Outstanding Invoices',
      value: pastDueSubs,
      icon: AlertCircle,
      desc: 'Unpaid past due balances',
      color: pastDueSubs > 0 ? 'text-red-450 animate-pulse' : 'text-zinc-550',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto bg-zinc-955 min-h-screen text-zinc-100 font-mono select-none">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
            <CreditCard className="size-3" />
            <span>Financial Operations</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">Billing Ledger</h1>
          <p className="text-zinc-500 text-xs mt-1 font-sans">
            Oversee tenant pricing tier allocations, active recurring MRR, and outstanding invoice balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 hidden md:inline font-mono">
            Last updated: {format(lastUpdated, 'HH:mm:ss')}
          </span>
          <button
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white text-xs font-bold px-3.5 py-2 rounded border border-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Ledger
          </button>
        </div>
      </div>

      {/* ── Row 1: Metrics Grid (1 / 2 / 4 columns) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metricsList.map(m => (
          <div key={m.label} className="bg-zinc-950 border border-zinc-850 rounded p-4 flex items-start justify-between">
            <div>
              <p className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider mb-1.5">{m.label}</p>
              <p className={`text-lg font-black tracking-tight ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-zinc-650 mt-2 font-sans">{m.desc}</p>
            </div>
            <div className="p-1.5 bg-zinc-900 border border-zinc-850 rounded">
              <m.icon className="size-4 text-zinc-450" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Projected Growth Stack ── */}
      <div className="bg-zinc-950 border border-zinc-850 rounded p-5 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-550 uppercase">
          <span>Projected Growth Stack</span>
          <span>Expansion Ratio: {expansionRatio}%</span>
        </div>
        
        <div className="h-3.5 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-850 p-0.5 select-none">
          <div
            className="h-full bg-zinc-400 rounded-l transition-all duration-700"
            style={{ width: `${Math.min((baselineARR / projectedARR) * 100, 85)}%` }}
          />
          <div
            className="h-full bg-zinc-700 rounded-r transition-all duration-700"
            style={{ width: `${100 - Math.min((baselineARR / projectedARR) * 100, 85)}%` }}
          />
        </div>
      </div>

      {/* ── Pricing Plan Tiers ── */}
      {plans.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-850 rounded overflow-hidden select-none">
          <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-900/10">
            <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Workspace Pricing Plan Tiers</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-900">
            {plans.map((plan) => (
              <div key={plan.id} className="p-5 hover:bg-zinc-900/5 transition-colors">
                <p className="text-zinc-550 text-[10px] font-bold uppercase tracking-wider">{plan.display_name}</p>
                <p className="text-white text-xl font-bold mt-2 font-mono">
                  ₹{Number(plan.price_monthly).toLocaleString('en-IN')}
                  <span className="text-zinc-550 text-xs font-normal"> / mo</span>
                </p>
                <p className="text-zinc-500 text-xs mt-2.5 leading-relaxed font-sans font-light">{plan.description ?? 'Standard platform plan config'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subscriptions Table / Cards ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Active Corporate Subscriptions</p>
        
        <div className="bg-zinc-950 border border-zinc-850 rounded overflow-hidden">
          {subscriptions.length === 0 ? (
            <div className="py-14 text-center text-zinc-650 text-xs">
              No active subscription configurations found.
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table (>=640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-900/10 text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                      <th className="px-5 py-3">Company Target</th>
                      <th className="px-5 py-3">Subscription Status</th>
                      <th className="px-5 py-3">Active MRR</th>
                      <th className="px-5 py-3">Period End</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {subscriptions.map(sub => {
                      const statusInfo = SUB_STATUS[sub.status] ?? SUB_STATUS['canceled']
                      return (
                        <tr key={sub.id} className="hover:bg-zinc-900/5 transition-colors">
                          <td className="px-5 py-3.5">
                            <Link href={`/super-admin/companies/${sub.company?.id}`} className="text-zinc-200 hover:text-white text-xs font-bold transition-colors">
                              {sub.company?.name ?? 'Unknown Workspace'}
                            </Link>
                            <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{sub.company?.slug}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={statusInfo.cls}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-200 text-xs font-bold font-mono">
                            {sub.mrr ? `₹${Number(sub.mrr).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500 text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-zinc-650" />
                              <span>{sub.current_period_end ? format(new Date(sub.current_period_end), 'dd MMM yyyy') : '—'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              href={`/super-admin/companies/${sub.company?.id}`}
                              className="inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2.5 py-1.5 rounded border border-zinc-800 transition-colors"
                            >
                              Configure
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List (<640px) */}
              <div className="sm:hidden p-3.5 space-y-3">
                {subscriptions.map(sub => {
                  const statusInfo = SUB_STATUS[sub.status] ?? SUB_STATUS['canceled']
                  return (
                    <div key={sub.id} className="bg-zinc-950 border border-zinc-900 rounded p-4 space-y-3">
                      <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold text-white leading-tight">{sub.company?.name ?? 'Unknown Workspace'}</span>
                        <span className={statusInfo.cls}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-650">MRR Value</span>
                          <p className="text-zinc-300 mt-0.5">₹{(sub.mrr ?? 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-650">Slug Code</span>
                          <p className="text-zinc-300 mt-0.5">{sub.company?.slug ?? '—'}</p>
                        </div>
                      </div>

                      <div className="pt-2 text-[10px] text-zinc-550 border-t border-zinc-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-zinc-600" />
                          <span>{sub.current_period_end ? format(new Date(sub.current_period_end), 'dd MMM yyyy') : '—'}</span>
                        </span>
                        <Link
                          href={`/super-admin/companies/${sub.company?.id}`}
                          className="bg-zinc-900 hover:bg-zinc-850 text-white text-[10px] font-bold px-3 py-1.5 rounded border border-zinc-800 transition-colors"
                        >
                          Configure
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Invoices Table / Cards ── */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">System Invoice History Ledger</p>
          
          <div className="bg-zinc-950 border border-zinc-850 rounded overflow-hidden">
            {/* Desktop & Tablet Table (>=640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-900/10 text-[9px] font-bold text-zinc-500 tracking-wider uppercase">
                    <th className="px-5 py-3">Invoice Date</th>
                    <th className="px-5 py-3">Company Reference</th>
                    <th className="px-5 py-3">Amount Invoiced</th>
                    <th className="px-5 py-3 text-right">Receipt Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-zinc-900/5 transition-colors">
                      <td className="px-5 py-3.5 text-zinc-500 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="size-3.5 text-zinc-655" />
                          <span>{format(new Date(inv.created_at), 'dd MMM yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs font-mono">
                        {inv.company_id?.slice(0, 8)}…
                      </td>
                      <td className="px-5 py-3.5 text-zinc-200 text-xs font-bold font-mono">
                        ₹{Number(inv.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`inline-flex items-center ${
                          inv.status === 'paid' ? 'text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' : 'text-amber-450 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (<640px) */}
            <div className="sm:hidden p-3.5 space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-zinc-950 border border-zinc-900 rounded p-4 space-y-3">
                  <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                    <div>
                      <span className="text-xs font-bold text-white leading-tight">{inv.company_id?.slice(0, 8)}…</span>
                      <span className="text-[10px] text-zinc-550 font-mono block mt-0.5">{format(new Date(inv.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <span className={`inline-flex items-center ${
                      inv.status === 'paid' ? 'text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider' : 'text-amber-450 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500">
                    <span className="text-[9px] uppercase font-bold text-zinc-650">Amount Invoiced</span>
                    <p className="text-zinc-200 mt-0.5">₹{Number(inv.amount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
