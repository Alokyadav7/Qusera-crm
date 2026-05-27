"use client"
import { ArrowRight, Users, Clock, BarChart3, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <section id="integrations" className="py-20 bg-background border-t border-border/60">
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

        <div className="mx-auto max-w-3xl grid grid-cols-2 md:grid-cols-3 gap-4">
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
          <Button variant="link" asChild className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            <Link href="/api-docs">
              Read the developer API docs →
            </Link>
          </Button>
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
  return (
    <section className="py-20 bg-background border-t border-border/60">
      <div className="container mx-auto px-4 md:px-6">
        {/* Stats Grid */}
        <div className="mx-auto max-w-3xl mb-16 grid grid-cols-2 md:grid-cols-4 gap-4">
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
            Get started for free. No credit card required. Cancel anytime.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild className="h-10 px-6 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-sm transition-all">
              <Link href="/login">
                Get started free
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-10 px-6 text-xs font-semibold rounded-lg border-border hover:bg-muted/40 transition-all">
              <Link href="/login">
                Contact sales
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
