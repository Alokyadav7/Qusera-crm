"use client"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Play, Users, BarChart3, TrendingUp, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function HeroSection() {
  const [stats, setStats] = useState({ totalLeads: 1480, winRate: 94.2, revenue: 1840000 })

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true })
        const { data: won } = await supabase.from('leads').select('deal_value').eq('status', 'closed_won')
        const { count: totalWon } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'closed_won')
        if (total && total > 0) {
          setStats({
            totalLeads: total,
            winRate: totalWon ? Math.round((totalWon / total) * 1000) / 10 : 94.2,
            revenue: won ? won.reduce((s: number, d: any) => s + (Number(d.deal_value) || 0), 0) : 1840000,
          })
        }
      } catch {}
    }
    load()
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-8">
            <span className="size-1 bg-foreground rounded-full" />
            KlinqCRM for Indian Sales Teams
          </div>

          {/* Headline */}
          <h1 className="font-sans text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-balance text-foreground leading-[1.1]">
            The CRM built for growing Indian businesses.
          </h1>

          {/* Sub */}
          <p className="mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed">
            Manage leads, close deals, and stay on top of every WhatsApp, SMS, and Email conversation — all in one place.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Button size="lg" asChild className="h-10 px-6 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-sm transition-all">
              <Link href="/login">
                Sign in to Workspace
                <ArrowRight className="ml-2 size-3.5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-10 px-6 text-xs font-semibold rounded-lg border-border hover:bg-muted/40 transition-all">
              <Link href="/login">
                Request Access
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-4 text-[11px] text-muted-foreground/80">
            <span className="flex items-center gap-1"><Check className="size-3 text-foreground" /> Invite-only access</span>
            <span className="flex items-center gap-1"><Check className="size-3 text-foreground" /> Dedicated company onboarding</span>
          </div>
        </div>

        {/* Dashboard Preview - Realistic Laptop Chassis */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          {/* Laptop Screen & Bezel */}
          <div className="relative rounded-2xl border-[6px] border-[#1e1e1e] bg-[#1e1e1e] shadow-2xl p-1.5">
            {/* Webcam dot */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-neutral-700" />
            
            {/* Inner Display Screen */}
            <div className="rounded-lg bg-card overflow-hidden aspect-[16/10] w-full border border-neutral-800">
              <div className="size-full bg-background flex flex-col">
                {/* Header */}
                <div className="h-11 border-b border-border/60 px-4 flex items-center justify-between bg-muted/20 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-border" />
                    <div className="size-2.5 rounded-full bg-border" />
                    <div className="size-2.5 rounded-full bg-border" />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground bg-background border border-border/40 rounded px-4 py-0.5">
                    dashboard.KlinqCRM.in
                  </div>
                  <div className="w-14" />
                </div>
                
                {/* Body */}
                <div className="flex-1 flex min-h-0 bg-background text-foreground">
                  {/* Sidebar */}
                  <div className="w-48 border-r border-border/40 p-3 flex flex-col gap-1 shrink-0 bg-muted/10">
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 mb-2">Workspace</span>
                    {[
                      { label: 'Overview', active: true },
                      { label: 'Leads Directory', active: false },
                      { label: 'Voice Inbox', active: false },
                      { label: 'Settings', active: false },
                    ].map(item => (
                      <div key={item.label} className={`px-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-all ${item.active ? 'bg-foreground/5 font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {item.label}
                      </div>
                    ))}
                  </div>
                  
                  {/* Main Content */}
                  <div className="flex-1 p-6 flex flex-col gap-6 bg-background overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold tracking-tight">Active Operations</h2>
                        <p className="text-xs text-muted-foreground">Overview of current sales pipeline</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-border/60">Live Updates</Badge>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Active Leads', val: stats.totalLeads.toLocaleString() },
                        { label: 'Avg Win Rate', val: `${stats.winRate}%` },
                        { label: 'Tracked Revenue', val: `₹${(stats.revenue / 100000).toFixed(1)}L` },
                      ].map(s => (
                        <div key={s.label} className="p-4 rounded-xl border border-border/60 bg-muted/10">
                          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{s.label}</span>
                          <div className="text-lg font-bold text-foreground mt-1">{s.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Main pipeline table */}
                    <div className="flex-1 rounded-xl border border-border/50 p-4">
                      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3 block">High Intent Pipeline</span>
                      <div className="flex flex-col gap-2">
                        {[
                          { name: 'Sanjay Gupta', co: 'Reliance Retail', val: '₹40k', badge: 'Hot', status: 'Verification pending' },
                          { name: 'Kavita Sharma', co: 'Tata Motors', val: '₹1.2L', badge: 'In Discussion', status: 'Follow-up scheduled' },
                        ].map((r, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/40 text-xs">
                            <div>
                              <p className="font-semibold text-foreground">{r.name}</p>
                              <p className="text-[10px] text-muted-foreground">{r.co} · {r.status}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">{r.val}</span>
                              <Badge variant="outline" className="text-[9px]">{r.badge}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Laptop Base Hinge & Feet */}
          <div className="relative mx-auto w-[104%] -left-[2%] h-4 bg-[#282828] rounded-b-xl border-t border-[#3a3a3a] shadow-lg">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-[#1a1a1a] rounded-b-md" />
          </div>
        </div>

        {/* Logos */}
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-6">Trusted by leading companies</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-50 grayscale">
            {['TechCorp', 'GrowthBox', 'FinanceHub', 'RetailMax', 'ServicePro', 'ScaleUp'].map(co => (
              <span key={co} className="text-xs font-bold tracking-tight text-foreground">{co}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
