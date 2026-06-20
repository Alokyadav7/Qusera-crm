"use client"
import { useState } from 'react'
import { Users, Clock, BarChart3, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DemoModal } from './demo-modal'
import Link from 'next/link'

const INTEGRATIONS = [
  { name: 'WhatsApp Business', cat: 'Communication', emoji: '💬' },
  { name: 'Google Workspace', cat: 'Productivity', emoji: '📁' },
  { name: 'Microsoft Teams', cat: 'Productivity', emoji: '👥' },
  { name: 'Tally ERP', cat: 'Accounting', emoji: '📊' },
  { name: 'Razorpay', cat: 'Payments', emoji: '💳' },
  { name: 'Zoho Books', cat: 'Accounting', emoji: '📒' },
]

export function IntegrationsSection() {
  return (
    <section id="integrations" className="py-14 sm:py-20 bg-background border-t border-border/60">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-6">
            Integrations
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Connects with your stack
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
            Sync calls, messages, and transaction records with your favorite tools.
          </p>
        </div>

        <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {INTEGRATIONS.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-lg">{item.emoji}</div>
              <div>
                <p className="text-xs font-bold text-foreground">{item.name}</p>
                <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">{item.cat}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            And many more via our open REST API →{' '}
            <Link href="/api-docs" className="font-semibold underline underline-offset-2 hover:text-foreground transition-colors">
              Read the docs
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

const STATS = [
  { icon: Users, val: '10,000+', label: 'Sales teams' },
  { icon: BarChart3, val: '94.2%', label: 'Average win rate' },
  { icon: Clock, val: '9 min', label: 'Saved per call' },
  { icon: CheckCircle2, val: '₹18Cr+', label: 'Revenue tracked' },
]

export function CTASection() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIntent, setModalIntent] = useState<'demo' | 'trial'>('demo')

  function openModal(intent: 'demo' | 'trial') {
    setModalIntent(intent)
    setModalOpen(true)
  }

  return (
    <>
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} defaultIntent={modalIntent} />

      <section className="py-14 sm:py-20 bg-background border-t border-border/60">
        <div className="container mx-auto px-4 md:px-6">
          {/* Stats Grid */}
          <div className="mx-auto max-w-3xl mb-12 sm:mb-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-start p-5 border border-border/50 bg-card rounded-xl">
                <span className="text-2xl font-bold tracking-tight text-foreground">{s.val}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{s.label}</span>
              </div>
            ))}
          </div>

          {/* CTA Block */}
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground mb-4">
              Ready to upgrade your sales process?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
              Access is by invitation only. Request a workspace onboarding session today. We verify every request — no fake signups.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => openModal('demo')}
                className="w-full sm:w-auto h-11 px-6 text-sm font-semibold rounded-lg bg-foreground text-background hover:bg-emerald-600 hover:text-white shadow-sm transition-all cursor-pointer"
              >
                Book a Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => openModal('trial')}
                className="w-full sm:w-auto h-11 px-6 text-sm font-semibold rounded-lg border-border hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer"
              >
                Start Free Trial
              </Button>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground/70">
              🔒 Email OTP verified · No spam · Response within 24 hours
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
