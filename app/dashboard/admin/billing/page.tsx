'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { CreditCard, CheckCircle2, AlertTriangle, TrendingUp, Loader2, Zap, RefreshCw, MailOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

declare global {
  interface Window {
    Razorpay: any
  }
}

const PLANS = [
  { id: 'pro',        name: 'Pro Plan',        price: 2999,  features: ['Unlimited leads scoping', 'Up to 10 team seats', 'Complete reporting dashboard', 'Integrations enabled'] },
  { id: 'enterprise', name: 'Enterprise Plan', price: 9999,  features: ['Unlimited seats', 'Custom domain mapping', 'Full compliance audit logs', 'SMTP relay setup', '24/7 dedicated support'] },
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
  const [requestingCustom, setRequestingCustom] = useState<string | null>(null)
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

  // Process Razorpay online payment
  async function handleUpgrade(planId: string) {
    if (!companyId) { toast.error('Company ID context missing'); return }
    setUpgrading(planId)

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { toast.error('Failed to load payment gateway'); setUpgrading(null); return }

      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, company_id: companyId }),
      })
      const order = await res.json()
      if (!res.ok) { toast.error(order.error ?? 'Failed to initiate order'); setUpgrading(null); return }

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Klinq CRM',
        description: order.plan_name,
        order_id: order.order_id,
        prefill: { name: userName, email: userEmail },
        theme: { color: '#818cf8' },
        handler: async function () {
          toast.success('Payment successful! Synchronizing workspace...')
          setTimeout(() => { load(); setUpgrading(null) }, 2500)
        },
        modal: {
          ondismiss: () => setUpgrading(null),
        },
      })
      rzp.open()
    } catch (e: any) {
      toast.error(e.message ?? 'Payment flow aborted')
      setUpgrading(null)
    }
  }

  // Trigger manual invoice/custom plan upgrade via email
  async function handleCustomRequest(planId: string) {
    setRequestingCustom(planId)
    try {
      const res = await fetch('/api/admin/billing/upgrade-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Upgrade request sent! Our support team will contact you shortly.')
      } else {
        toast.error(data.error || 'Failed to request upgrade. Try again later.')
      }
    } catch {
      toast.error('An error occurred while sending custom request')
    } finally {
      setRequestingCustom(null)
    }
  }

  const plan   = sub?.plan_id ?? 'free'
  const status = sub?.status  ?? 'trial'
  const mrr    = sub?.mrr     ?? 0
  const isActive = status === 'active'

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Billing & Subscription" subtitle="Admin billing console, active subscription tier, occupied seats, and billing logs" />

      <div className="p-6 max-w-4xl space-y-6">
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Plan Details */}
              <Card className="md:col-span-2 border-border/60">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardDescription className="text-xs uppercase font-bold tracking-wider">Current Subscription Plan</CardDescription>
                      <CardTitle className="text-2xl font-extrabold capitalize mt-1 text-foreground">{plan} Tier</CardTitle>
                    </div>
                    <Badge variant="outline" className={`px-3 py-1 font-bold ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : status === 'trial'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {isActive ? 'Active' : status === 'trial' ? 'Trial Period' : 'Past Due'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/60">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Plan MRR</p>
                      <p className="text-lg font-bold text-primary mt-0.5">₹{Number(mrr).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Cycle End</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    {status === 'trial' && sub?.trial_ends_at && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-amber-600">Trial Expiration</p>
                        <p className="text-sm font-bold text-amber-600 mt-0.5">
                          {new Date(sub.trial_ends_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Occupied Seats / Stats */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Workspace Usage</CardTitle>
                  <CardDescription>Metrics for active cycle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b last:border-0 border-border/40">
                    <span className="text-xs text-muted-foreground font-medium">Occupied Seats</span>
                    <span className="text-sm font-bold">{seatsCount} / {plan === 'free' ? 3 : plan === 'pro' ? 10 : 'Unlimited'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b last:border-0 border-border/40">
                    <span className="text-xs text-muted-foreground font-medium">Total Leads</span>
                    <span className="text-sm font-bold">{leadsCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plans List */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Zap className="size-5 text-primary" /> Upgrade Subscription Tier
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLANS.map(p => (
                  <Card key={p.id} className="border-border/60 flex flex-col justify-between">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-bold">{p.name}</CardTitle>
                          <p className="text-2xl font-extrabold text-primary mt-1">
                            ₹{p.price.toLocaleString('en-IN')}
                            <span className="text-xs font-normal text-muted-foreground">/month</span>
                          </p>
                        </div>
                        <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                          {p.id}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <ul className="space-y-2.5 text-xs text-muted-foreground">
                        {p.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <div className="p-5 pt-0 grid grid-cols-1 gap-2">
                      <Button
                        onClick={() => handleUpgrade(p.id)}
                        disabled={!!upgrading || !!requestingCustom}
                        className="w-full text-xs font-semibold shadow-sm"
                      >
                        {upgrading === p.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          'Pay Instantly with Razorpay'
                        )}
                      </Button>
                      <Button
                        onClick={() => handleCustomRequest(p.id)}
                        disabled={!!upgrading || !!requestingCustom}
                        variant="outline"
                        className="w-full text-xs font-semibold gap-1.5"
                      >
                        {requestingCustom === p.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <MailOpen className="size-3.5" />
                        )}
                        Request Custom Invoice
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Invoices */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" /> Invoice History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-8">No billing records found for this workspace</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          {['Billing Date', 'Charge', 'Status', 'Payment Reference ID'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv: any) => (
                          <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3.5 text-xs font-medium">{new Date(inv.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3.5 text-xs font-bold text-foreground">₹{Number(inv.amount).toLocaleString()}</td>
                            <td className="px-4 py-3.5">
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 uppercase text-[9px] font-bold">
                                {inv.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                              {inv.razorpay_payment_id ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
