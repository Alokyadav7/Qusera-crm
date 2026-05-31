"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Check } from 'lucide-react'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DemoModal } from './demo-modal'

export function HeroSection() {
  const [stats, setStats] = useState({ totalLeads: 1480, winRate: 94.2, revenue: 1840000 })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIntent, setModalIntent] = useState<'demo' | 'trial'>('demo')

  function openModal(intent: 'demo' | 'trial') {
    setModalIntent(intent)
    setModalOpen(true)
  }

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
    <>
      <DemoModal open={modalOpen} onClose={() => setModalOpen(false)} defaultIntent={modalIntent} />

      <section className="relative min-h-screen flex flex-col justify-center pt-20 pb-12 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl text-center flex flex-col items-center">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-6">
              <span className="size-1 bg-foreground rounded-full" />
              KlinqCRM for Indian Sales Teams
            </div>

            {/* Headline */}
            <h1 className="font-sans text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-balance text-foreground leading-[1.1]">
              The CRM built for growing Indian businesses.
            </h1>

            {/* Subheadline */}
            <p className="mt-5 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed px-2">
              Manage leads, close deals, and stay on top of every WhatsApp, SMS, and Email conversation — all in one place.
            </p>

            {/* CTAs */}
            <div className="mt-7 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button
                size="lg"
                onClick={() => openModal('demo')}
                className="w-full sm:w-auto h-11 px-6 text-sm font-semibold rounded-lg bg-foreground text-background hover:bg-emerald-600 hover:text-white shadow-sm transition-all cursor-pointer"
              >
                Book a Demo
                <ArrowRight className="ml-2 size-3.5" />
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

            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/80">
              <span className="flex items-center gap-1"><Check className="size-3 text-foreground" /> Invite-only access</span>
              <span className="flex items-center gap-1"><Check className="size-3 text-foreground" /> Dedicated company onboarding</span>
            </div>
          </div>

          {/* ── Dashboard Mockup ──────────────────────────────── */}
          <div className="relative mx-auto mt-12 sm:mt-16 w-full max-w-5xl px-0 sm:px-4">
            {/* Laptop bezel */}
            <div className="relative rounded-xl sm:rounded-2xl border-[4px] sm:border-[6px] border-[#1e1e1e] bg-[#1e1e1e] shadow-2xl p-1 sm:p-1.5">
              {/* Webcam dot */}
              <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-neutral-700" />

              {/* Screen */}
              <div className="rounded-md sm:rounded-lg bg-card overflow-hidden aspect-[16/10] w-full border border-neutral-800">
                <div className="size-full bg-background flex flex-col">
                  {/* Browser chrome */}
                  <div className="h-8 sm:h-11 border-b border-border/60 px-2 sm:px-4 flex items-center justify-between bg-muted/20 shrink-0">
                    <div className="flex gap-1 sm:gap-1.5">
                      <div className="size-2 sm:size-2.5 rounded-full bg-border" />
                      <div className="size-2 sm:size-2.5 rounded-full bg-border" />
                      <div className="size-2 sm:size-2.5 rounded-full bg-border" />
                    </div>
                    <div className="text-[8px] sm:text-[10px] font-mono text-muted-foreground bg-background border border-border/40 rounded px-2 sm:px-4 py-0.5">
                      dashboard.KlinqCRM.in
                    </div>
                    <div className="w-10 sm:w-14" />
                  </div>

                  {/* App body */}
                  <div className="flex-1 flex min-h-0 bg-background text-foreground overflow-hidden">
                    {/* Sidebar */}
                    <div className="hidden sm:flex w-32 md:w-48 border-r border-border/40 p-2 sm:p-3 flex-col gap-1 shrink-0 bg-muted/10">
                      <span className="text-[7px] sm:text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 mb-2">Workspace</span>
                      {[
                        { label: 'Overview', active: true },
                        { label: 'Leads Directory', active: false },
                        { label: 'Voice Inbox', active: false },
                        { label: 'Settings', active: false },
                      ].map(item => (
                        <div key={item.label} className={`px-2 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[11px] font-medium cursor-pointer transition-all truncate ${item.active ? 'bg-foreground/5 font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                          {item.label}
                        </div>
                      ))}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 p-2 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-6 bg-background overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h2 className="text-xs sm:text-base font-bold tracking-tight">Active Operations</h2>
                          <p className="text-[9px] sm:text-xs text-muted-foreground">Overview of current sales pipeline</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] sm:text-[10px] font-mono border-border/60 shrink-0">Live Updates</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                        {[
                          { label: 'Active Leads', val: stats.totalLeads.toLocaleString() },
                          { label: 'Avg Win Rate', val: `${stats.winRate}%` },
                          { label: 'Revenue', val: `₹${(stats.revenue / 100000).toFixed(1)}L` },
                        ].map(s => (
                          <div key={s.label} className="p-2 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 bg-muted/10">
                            <span className="text-[7px] sm:text-[10px] text-muted-foreground font-mono uppercase tracking-wider block truncate">{s.label}</span>
                            <div className="text-xs sm:text-lg font-bold text-foreground mt-0.5">{s.val}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 rounded-lg sm:rounded-xl border border-border/50 p-2 sm:p-4 overflow-hidden">
                        <span className="text-[7px] sm:text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2 block">High Intent Pipeline</span>
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                          {[
                            { name: 'Sanjay Gupta', co: 'Reliance Retail', val: '₹40k', badge: 'Hot', status: 'Verification pending' },
                            { name: 'Kavita Sharma', co: 'Tata Motors', val: '₹1.2L', badge: 'In Discussion', status: 'Follow-up scheduled' },
                          ].map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-1.5 sm:p-3 rounded-md sm:rounded-lg border border-border/40">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-[9px] sm:text-xs truncate">{r.name}</p>
                                <p className="text-[7px] sm:text-[10px] text-muted-foreground truncate hidden sm:block">{r.co} · {r.status}</p>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-2">
                                <span className="font-semibold text-[9px] sm:text-xs">{r.val}</span>
                                <Badge variant="outline" className="text-[7px] sm:text-[9px] px-1 py-0">{r.badge}</Badge>
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
            {/* Laptop base hinge */}
            <div className="relative mx-auto w-[103%] -left-[1.5%] h-2.5 sm:h-4 bg-[#282828] rounded-b-lg sm:rounded-b-xl border-t border-[#3a3a3a] shadow-lg">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 sm:w-24 h-1 sm:h-1.5 bg-[#1a1a1a] rounded-b-md" />
            </div>
          </div>

          {/* Trusted by */}
          <div className="mx-auto mt-12 sm:mt-16 max-w-3xl text-center px-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mb-5">Trusted by leading companies</p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 opacity-50 grayscale">
              {['TechCorp', 'GrowthBox', 'FinanceHub', 'RetailMax', 'ServicePro', 'ScaleUp'].map(co => (
                <span key={co} className="text-xs font-bold tracking-tight text-foreground">{co}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
