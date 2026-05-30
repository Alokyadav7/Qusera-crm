'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { CreditCard, CheckCircle2, AlertTriangle, TrendingUp, Loader2, Zap, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

declare global {
  interface Window {
    Razorpay: any
  }
}

const PLANS = [
  { id: 'pro',        name: 'Pro',        price: 2999,  features: ['Unlimited leads', '10 team seats', 'Advanced analytics', 'Compliance checks'] },
  { id: 'enterprise', name: 'Enterprise', price: 9999,  features: ['Unlimited everything', 'Dedicated support', 'Custom domain', 'API access'] },
]

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function AdminBillingPage() {
  const [sub, setSub]         = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [leadsCount, setLeadsCount] = useState(0)
  const [seatsCount, setSeatsCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    setUserEmail(user.email ?? '')
    setUserName(user.user_metadata?.full_name ?? user.email ?? '')

    // Get company
    const compRes = await (supabase as any)
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    const cid = compRes.data?.company_id
    setCompanyId(cid ?? null)

    if (!cid) { setLoading(false); return }

    const [subRes, invRes, leadsRes, seatsRes] = await Promise.all([
      (supabase as any).from('subscriptions').select('*').eq('company_id', cid).single(),
      (supabase as any).from('invoices').select('*').eq('company_id', cid).order('created_at', { ascending: false }).limit(10),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('company_id' as any, cid),
      (supabase as any).from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true),
    ])
    setSub(subRes.data ?? null)
    setInvoices(invRes.data ?? [])
    setLeadsCount(leadsRes.count ?? 0)
    setSeatsCount(seatsRes.count ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUpgrade(planId: string) {
    if (!companyId) { toast.error('Company not found'); return }
    setUpgrading(planId)

    try {
      // Load Razorpay checkout script
      const loaded = await loadRazorpayScript()
      if (!loaded) { toast.error('Failed to load payment gateway'); setUpgrading(null); return }

      // Create order
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, company_id: companyId }),
      })
      const order = await res.json()
      if (!res.ok) { toast.error(order.error ?? 'Failed to create order'); setUpgrading(null); return }

      // Open Razorpay modal
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Klinq CRM',
        description: order.plan_name,
        order_id: order.order_id,
        prefill: { name: userName, email: userEmail },
        theme: { color: '#18181b' },
        handler: async function (response: any) {
          // Payment succeeded — refresh subscription
          toast.success('Payment successful! Activating your plan…')
          // Wait a moment for webhook to process, then reload
          setTimeout(() => { load(); setUpgrading(null) }, 2500)
        },
        modal: {
          ondismiss: () => setUpgrading(null),
        },
      })
      rzp.open()
    } catch (e: any) {
      toast.error(e.message ?? 'Payment failed')
      setUpgrading(null)
    }
  }

  const plan   = sub?.plan_id ?? 'free'
  const status = sub?.status  ?? 'trial'
  const mrr    = sub?.mrr     ?? 0
  const isActive = status === 'active'

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Billing & Subscription" subtitle="Manage your plan, usage, and invoices" />

      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
        {loading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            {/* ── Current Plan Card ── */}
            <div className="border rounded-xl p-6 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Plan</p>
                  <p className="text-2xl font-bold capitalize">{plan}</p>
                </div>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : status === 'trial'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {isActive ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                  {isActive ? 'Active' : status === 'trial' ? 'Trial' : 'Past Due'}
                </span>
              </div>

              <div className="flex gap-6 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly</p>
                  <p className="text-xl font-bold text-primary">₹{Number(mrr).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Renewal</p>
                  <p className="text-sm font-medium">
                    {sub?.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString('en-IN')
                      : '—'}
                  </p>
                </div>
                {status === 'trial' && sub?.trial_ends_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Trial ends</p>
                    <p className="text-sm font-medium text-amber-600">
                      {new Date(sub.trial_ends_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Upgrade Plans (show if not active) ── */}
            {!isActive && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Upgrade Your Plan</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PLANS.map(p => (
                    <div key={p.id} className="border rounded-xl p-5 bg-card space-y-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-lg">{p.name}</p>
                          <p className="text-2xl font-black text-primary mt-1">₹{p.price.toLocaleString('en-IN')}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        </div>
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Zap className="size-5 text-primary" />
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {p.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="size-3.5 text-emerald-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleUpgrade(p.id)}
                        disabled={!!upgrading}
                      >
                        {upgrading === p.id
                          ? <><Loader2 className="size-4 animate-spin" />Processing…</>
                          : <>Upgrade to {p.name} →</>
                        }
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Usage ── */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Leads Used', value: String(leadsCount), icon: TrendingUp },
                { label: 'Team Seats', value: String(seatsCount), icon: CreditCard },
                { label: 'Workspaces', value: '1', icon: CheckCircle2 },
              ].map(m => (
                <div key={m.label} className="border rounded-xl p-4 bg-card text-center">
                  <m.icon className="size-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* ── Invoice History ── */}
            <div className="border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-semibold">Invoice History</p>
              </div>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No invoices yet</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {['Date', 'Amount', 'Status', 'Payment ID'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm">{new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-sm font-medium">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {inv.razorpay_payment_id ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
