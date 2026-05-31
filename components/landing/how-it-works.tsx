"use client"
import { Phone, Mic, Brain, TrendingUp } from 'lucide-react'

const STEPS = [
  { n: '01', icon: Phone, title: 'Connect channels', desc: 'Link your communication and WhatsApp channels in minutes.' },
  { n: '02', icon: Mic, title: 'Record voice updates', desc: 'Simply talk to capture updates, notes, and metrics.' },
  { n: '03', icon: Brain, title: 'AI extracts data', desc: 'AI extracts contacts, deal values, and tasks automatically.' },
  { n: '04', icon: TrendingUp, title: 'Close more deals', desc: 'Watch your pipeline progress without manual data entry.' },
]

export function HowItWorksSection() {
  return (
    <section className="py-14 sm:py-20 bg-background border-t border-border/60">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-6">
            Process
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Simple implementation
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Get up and running in under ten minutes.
          </p>
        </div>

        <div className="mx-auto max-w-4xl grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex flex-col items-start p-6 border border-border/50 bg-card rounded-xl">
              <span className="text-[10px] font-mono text-muted-foreground/60 mb-4">{step.n}</span>
              <h3 className="text-sm font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
