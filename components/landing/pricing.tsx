"use client"
import { Check, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { DemoModal } from './demo-modal'

const PLANS = [
  {
    name: 'Starter',
    monthly: '999',
    annual: '799',
    desc: 'Perfect for small teams getting started',
    cta: 'Request Access',
    popular: false,
    features: [
      { t: 'Up to 5 users', ok: true },
      { t: '1,000 leads/month', ok: true },
      { t: 'WhatsApp integration', ok: true },
      { t: 'Basic voice recording', ok: true },
      { t: 'Email support', ok: true },
      { t: '5 GB storage', ok: true },
      { t: 'AI sentiment analysis', ok: false },
      { t: 'Route optimization', ok: false },
      { t: 'Advanced analytics', ok: false },
    ],
  },
  {
    name: 'Professional',
    monthly: '2,499',
    annual: '1,999',
    desc: 'Best for growing sales teams',
    cta: 'Request Access',
    popular: true,
    features: [
      { t: 'Up to 25 users', ok: true },
      { t: 'Unlimited leads', ok: true },
      { t: 'Full WhatsApp Business API', ok: true },
      { t: 'Voice-to-CRM (10+ languages)', ok: true },
      { t: 'Priority support', ok: true },
      { t: '50 GB storage', ok: true },
      { t: 'AI sentiment analysis', ok: true },
      { t: 'Route optimization', ok: true },
      { t: 'Advanced analytics', ok: true },
    ],
  },
  {
    name: 'Enterprise',
    monthly: 'Custom',
    annual: 'Custom',
    desc: 'For large orgs with custom needs',
    cta: 'Contact sales',
    popular: false,
    features: [
      { t: 'Unlimited users', ok: true },
      { t: 'Unlimited everything', ok: true },
      { t: 'Custom integrations', ok: true },
      { t: 'Dedicated account manager', ok: true },
      { t: '24/7 phone support', ok: true },
      { t: 'On-premise deployment', ok: true },
      { t: 'SLA guarantee', ok: true },
      { t: 'Custom AI model training', ok: true },
      { t: 'SSO & advanced security', ok: true },
    ],
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIntent, setModalIntent] = useState<'demo' | 'trial'>('trial')

  return (
    <section id="pricing" className="py-14 sm:py-20 bg-background border-t border-border/60">
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} defaultIntent={modalIntent} />

      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-6">
            Pricing
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Simple pricing
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
            Choose a plan that fits your stage. 14-day free trial on all options.
          </p>

          {/* Toggle */}
          <div className="mt-6 inline-flex items-center gap-2 p-1 rounded-lg border border-border bg-muted/20">
            <button
              onClick={() => setAnnual(false)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${!annual ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${annual ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Annual
              <span className="text-[10px] font-bold text-foreground bg-foreground/10 px-1 rounded-sm">-20%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="mx-auto max-w-4xl grid gap-5 md:grid-cols-3">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-6 bg-card transition-all ${
                plan.popular
                  ? 'border-foreground shadow-sm'
                  : 'border-border/60'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-sm font-bold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  {plan.monthly !== 'Custom' && (
                    <span className="text-xl font-semibold text-muted-foreground">₹</span>
                  )}
                  <span className="text-4xl font-bold tracking-tight">
                    {annual ? plan.annual : plan.monthly}
                  </span>
                  {plan.monthly !== 'Custom' && (
                    <span className="text-xs text-muted-foreground">/mo</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {plan.desc}
                </p>
              </div>

              <div className="flex-1 py-4 border-t border-border/40">
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f.t} className="flex items-center gap-2">
                      {f.ok
                        ? <Check className="size-3.5 shrink-0 text-foreground" />
                        : <Minus className="size-3.5 shrink-0 text-muted-foreground/30" />
                      }
                      <span className={`text-xs ${f.ok ? 'text-foreground' : 'text-muted-foreground/45'}`}>
                        {f.t}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-border/40 mt-4">
                <Button
                  onClick={() => {
                    setModalIntent(plan.name === 'Enterprise' ? 'demo' : 'trial')
                    setModalOpen(true)
                  }}
                  className={`w-full h-9 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    plan.popular
                      ? 'bg-foreground text-background hover:bg-emerald-600 hover:text-white'
                      : 'bg-muted text-foreground hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
