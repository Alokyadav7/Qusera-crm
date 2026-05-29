import { createServiceClient } from '@/lib/supabase/service'
import { format } from 'date-fns'
import { CreditCard, TrendingUp, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Receipt, Calendar, Shield } from 'lucide-react'
import Link from 'next/link'

async function getBillingData() {
  const svc = createServiceClient()

  const [
    { data: subscriptions },
    { data: invoices },
    { data: plans },
  ] = await Promise.all([
    svc.from('subscriptions').select('*, company:companies(id, name, slug, status)').order('created_at', { ascending: false }),
    svc.from('invoices').select('*').order('created_at', { ascending: false }).limit(50),
    svc.from('plans').select('*').order('price_monthly', { ascending: true }),
  ])

  const totalMRR = (subscriptions ?? [])
    .filter((s: any) => s.status === 'active')
    .reduce((sum: number, s: any) => sum + (s.mrr ?? 0), 0)

  const totalARR = totalMRR * 12
  const activeSubs = (subscriptions ?? []).filter((s: any) => s.status === 'active').length
  const trialSubs = (subscriptions ?? []).filter((s: any) => s.status === 'trialing').length
  const pastDueSubs = (subscriptions ?? []).filter((s: any) => s.status === 'past_due').length

  return { subscriptions: subscriptions ?? [], invoices: invoices ?? [], plans: plans ?? [], totalMRR, totalARR, activeSubs, trialSubs, pastDueSubs }
}

const SUB_STATUS: Record<string, { label: string; icon: any; cls: string }> = {
  active:    { label: 'Active Subscription',    icon: CheckCircle2,   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase' },
  trialing:  { label: 'Trial Period',     icon: TrendingUp,     cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase' },
  past_due:  { label: 'Past Due Payment',  icon: AlertTriangle,  cls: 'text-red-400 bg-red-500/10 border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase' },
  canceled:  { label: 'Canceled Access',  icon: XCircle,        cls: 'text-zinc-550 bg-zinc-900 border-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase' },
  paused:    { label: 'Paused Interval',    icon: XCircle,        cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase' },
}

export default async function SuperAdminBillingPage() {
  const { subscriptions, invoices, plans, totalMRR, totalARR, activeSubs, trialSubs, pastDueSubs } = await getBillingData()

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[1500px] relative overflow-hidden">
      {/* Decorative ambient backgrounds */}
      <div className="absolute right-[5%] top-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.02] blur-[140px] pointer-events-none" />
      <div className="absolute left-[15%] bottom-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/[0.01] blur-[160px] pointer-events-none" />

      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-6 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
          <Shield className="size-3 text-violet-400" />
          <span>Financial Operations</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight font-display">
          Billing & Finance
        </h1>
        <p className="text-zinc-500 text-xs mt-1">
          Monitor Monthly Recurring Revenue (MRR), ARR pacing metrics, invoices, subscription tiers and customer billing events
        </p>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Monthly Recurring Revenue', value: `₹${totalMRR.toLocaleString('en-IN')}`, icon: TrendingUp, sub: 'Active tier subscriptions only', accent: true },
          { label: 'Annual Run Rate (ARR)', value: `₹${totalARR.toLocaleString('en-IN')}`, icon: CreditCard, sub: 'Projected monthly revenue * 12', accent: false },
          { label: 'Active Subscriptions', value: activeSubs, icon: CheckCircle2, sub: 'Isolated company spaces', accent: false },
          { label: 'Subscriptions At Risk', value: pastDueSubs, icon: AlertTriangle, sub: 'Past due payments to reconcile', accent: pastDueSubs > 0 },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 group ${
            k.accent && pastDueSubs > 0 && k.label.includes('Risk')
              ? 'border-red-500/20 bg-gradient-to-br from-red-500/[0.06] to-transparent'
              : k.accent 
                ? 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-transparent' 
                : 'border-zinc-800/80 bg-zinc-900/35 backdrop-blur-xl hover:border-zinc-700/80'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-455 text-xs font-semibold tracking-wide">{k.label}</span>
              <div className={`p-2 rounded-xl border ${
                k.accent && pastDueSubs > 0 && k.label.includes('Risk')
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : k.accent 
                    ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 group-hover:text-zinc-300'
              }`}>
                <k.icon className="size-4" />
              </div>
            </div>
            <p className="text-3xl font-black tracking-tight font-display text-white">{k.value}</p>
            <p className="text-zinc-550 text-[10px] font-mono mt-1.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Pricing plans overview widget */}
      {plans.length > 0 && (
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden relative z-10">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/20">
            <p className="text-white text-sm font-bold tracking-tight font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span>Available Workspace Pricing Tiers</span>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
            {plans.map((plan: any) => (
              <div key={plan.id} className="p-6 hover:bg-white/[0.01] transition-colors group">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">{plan.display_name}</p>
                <p className="text-white text-2xl font-black mt-2 font-display">
                  ₹{Number(plan.price_monthly).toLocaleString('en-IN')}
                  <span className="text-zinc-500 text-xs font-normal font-sans"> / month</span>
                </p>
                <p className="text-zinc-500 text-xs mt-2.5 leading-relaxed font-light font-sans">{plan.description ?? 'Standard platform plan config'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions table */}
      <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden relative z-10">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between">
          <p className="text-white text-sm font-bold tracking-tight font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span>Active Enterprise Subscriptions</span>
          </p>
          <span className="text-zinc-550 text-[10px] font-mono tracking-tight">{subscriptions.length} active instances</span>
        </div>
        
        {subscriptions.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm font-light">
            <CreditCard className="size-12 text-zinc-650 mb-3 mx-auto opacity-70" />
            <p className="text-zinc-400 font-bold">No subscriptions yet</p>
            <p className="text-zinc-650 text-xs mt-1">Tenant pricing configurations will display here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/20 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                  <th className="px-6 py-4">Company Target</th>
                  <th className="px-6 py-4">Subscription Status</th>
                  <th className="px-6 py-4">Active MRR</th>
                  <th className="px-6 py-4">Period End Timestamp</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {subscriptions.map((sub: any) => {
                  const statusInfo = SUB_STATUS[sub.status] ?? SUB_STATUS['canceled']
                  const Icon = statusInfo.icon
                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4.5">
                        <Link href={`/super-admin/companies/${sub.company?.id}`} className="text-zinc-200 hover:text-white text-sm font-bold transition-colors">
                          {sub.company?.name ?? 'Unknown Workspace'}
                        </Link>
                        <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{sub.company?.slug}</p>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center gap-1.5 border ${statusInfo.cls}`}>
                          <Icon className="size-3.5" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-zinc-200 text-sm font-bold font-mono">
                        {sub.mrr ? `₹${Number(sub.mrr).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-6 py-4.5 text-zinc-550 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" />
                          <span>{sub.current_period_end ? format(new Date(sub.current_period_end), 'dd MMM yyyy') : '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <Link href={`/super-admin/companies/${sub.company?.id}`}
                          className="text-xs text-zinc-500 hover:text-white hover:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-zinc-700/60 transition-all font-semibold cursor-pointer"
                        >
                          Configure →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden relative z-10">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/20">
            <p className="text-white text-sm font-bold tracking-tight font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span>System Invoice History Ledger</span>
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/20 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                  <th className="px-6 py-4">Invoice Date</th>
                  <th className="px-6 py-4">Company reference</th>
                  <th className="px-6 py-4">Amount Invoiced</th>
                  <th className="px-6 py-4">Receipt Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4 text-zinc-550 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="size-3.5 text-zinc-500" />
                        <span>{format(new Date(inv.created_at), 'dd MMM yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-350 text-xs font-mono">{inv.company_id?.slice(0, 8)}…</td>
                    <td className="px-6 py-4 text-zinc-200 text-sm font-bold font-mono">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center border ${SUB_STATUS[inv.status]?.cls ?? 'text-zinc-550 bg-zinc-900 border-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
