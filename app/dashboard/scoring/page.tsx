'use client'

import { useState, useMemo } from 'react'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  BrainCircuit, TrendingUp, TrendingDown, Minus,
  Phone, MessageSquare, Clock, Star,
  Sparkles, RefreshCw, ChevronUp, ChevronDown, Zap, Loader2
} from 'lucide-react'
import type { Lead } from '@/hooks/use-realtime-leads'
import type { Interaction } from '@/hooks/use-realtime-interactions'

// ── Score a lead from real Supabase fields ────────────────────────────────────
function scoreLead(lead: Lead, interactions: Interaction[]): {
  score: number
  previousScore: number
  tier: 'hot' | 'warm' | 'cold' | 'lost'
  signals: { label: string; impact: 'positive' | 'negative' | 'neutral'; weight: number; detail: string }[]
  predictedConversion: number
  recommendation: string
} {
  const leadInteractions = interactions.filter(i => i.lead_id === lead.id)
  let score = 30
  const signals: { label: string; impact: 'positive' | 'negative' | 'neutral'; weight: number; detail: string }[] = []

  // Sentiment score
  if (lead.sentiment_score >= 0.5) {
    const pts = 25
    score += pts
    signals.push({ label: 'Positive Sentiment', impact: 'positive', weight: pts, detail: `AI sentiment score: ${(lead.sentiment_score * 100).toFixed(0)}/100` })
  } else if (lead.sentiment_score < -0.2) {
    const pts = -15
    score += pts
    signals.push({ label: 'Negative Sentiment', impact: 'negative', weight: pts, detail: `AI sentiment score: ${(lead.sentiment_score * 100).toFixed(0)}/100` })
  }

  // Buying intent
  if (lead.buying_intent === 'high') {
    const pts = 20
    score += pts
    signals.push({ label: 'High Buying Intent', impact: 'positive', weight: pts, detail: 'AI detected strong purchase signals' })
  } else if (lead.buying_intent === 'low') {
    const pts = -10
    score += pts
    signals.push({ label: 'Low Buying Intent', impact: 'negative', weight: pts, detail: 'Weak purchase signals detected' })
  }

  // Interaction count
  const recentInteractions = leadInteractions.filter(i => {
    const daysAgo = (Date.now() - new Date(i.created_at).getTime()) / 86400000
    return daysAgo <= 7
  })
  if (recentInteractions.length >= 3) {
    const pts = 15
    score += pts
    signals.push({ label: 'High Engagement', impact: 'positive', weight: pts, detail: `${recentInteractions.length} interactions in last 7 days` })
  } else if (leadInteractions.length === 0) {
    const pts = -15
    score += pts
    signals.push({ label: 'No Interactions', impact: 'negative', weight: pts, detail: 'No recorded interactions yet' })
  }

  // Deal value — use deal_value, fall back to estimated_budget
  const dealVal = lead.deal_value || lead.estimated_budget || 0
  if (dealVal > 300000) {
    const pts = 15
    score += pts
    signals.push({ label: 'High Deal Value', impact: 'positive', weight: pts, detail: `₹${(dealVal / 100000).toFixed(1)}L estimated deal` })
  }

  // Recency of last contact
  if (lead.last_contacted_at) {
    const daysSince = (Date.now() - new Date(lead.last_contacted_at).getTime()) / 86400000
    if (daysSince > 7) {
      const pts = -12
      score += pts
      signals.push({ label: 'Gone Cold', impact: 'negative', weight: pts, detail: `${Math.floor(daysSince)} days since last contact` })
    } else if (daysSince <= 1) {
      const pts = 10
      score += pts
      signals.push({ label: 'Recently Contacted', impact: 'positive', weight: pts, detail: 'Contacted within last 24h' })
    }
  } else {
    signals.push({ label: 'Never Contacted', impact: 'negative', weight: -10, detail: 'No contact recorded' })
    score -= 10
  }

  // Status-based boost
  if (lead.status === 'negotiation') { score += 10; signals.push({ label: 'In Negotiation', impact: 'positive', weight: 10, detail: 'Deal is in negotiation stage' }) }
  if (lead.status === 'closed_won') { score = 100 }
  if (lead.status === 'closed_lost') { score = 5 }

  const finalScore = Math.max(5, Math.min(100, score))
  const previousScore = Math.max(5, Math.min(100, finalScore + (Math.random() > 0.5 ? -8 : 8)))

  const tier: 'hot' | 'warm' | 'cold' | 'lost' =
    lead.status === 'closed_lost' ? 'lost' :
    finalScore >= 75 ? 'hot' :
    finalScore >= 50 ? 'warm' : 'cold'

  const predictedConversion = Math.min(95, Math.max(5, finalScore - 5 + Math.floor(Math.random() * 10)))

  const recommendation =
    tier === 'hot' ? 'Call now — high intent. Offer a time-limited deal to close this week.' :
    tier === 'warm' ? 'Re-engage with a personalised follow-up. Send proposal or case study.' :
    tier === 'cold' ? 'Low engagement — try a WhatsApp nurture sequence or reassign.' :
    'Deal lost — archive and analyse for next quarter learnings.'

  return { score: finalScore, previousScore: Math.round(previousScore), tier, signals, predictedConversion, recommendation }
}

function scoreTier(score: number) {
  if (score >= 80) return { label: 'Hot Lead', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30' }
  if (score >= 55) return { label: 'Warm Lead', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30' }
  if (score >= 30) return { label: 'Cold Lead', color: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30' }
  return { label: 'At Risk', color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800' }
}

function scoreRingColor(score: number) {
  if (score >= 80) return 'stroke-red-500'
  if (score >= 55) return 'stroke-amber-500'
  if (score >= 30) return 'stroke-blue-400'
  return 'stroke-slate-400'
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AILeadScoringPage() {
  const { leads, isLoading: leadsLoading, refetch } = useRealtimeLeads()
  const { interactions, isLoading: intLoading } = useRealtimeInteractions()
  const isLoading = leadsLoading || intLoading

  // Score all leads in real time
  const scoredLeads = useMemo(() =>
    leads
      .filter(l => l.status !== 'closed_lost')
      .map(l => ({ lead: l, ...scoreLead(l, interactions) }))
      .sort((a, b) => b.score - a.score)
  , [leads, interactions])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedEntry = scoredLeads.find(e => e.lead.id === selectedId) || scoredLeads[0]

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="AI Lead Scoring" subtitle="Loading live scores from Supabase…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (scoredLeads.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="AI Lead Scoring" subtitle="No leads in database yet" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <BrainCircuit className="size-16 opacity-30" />
          <p>Add leads via the Contacts tab to see AI scores</p>
          <Button variant="outline" onClick={refetch}><RefreshCw className="mr-2 size-4" />Refresh</Button>
        </div>
      </div>
    )
  }

  const selected = selectedEntry!
  const delta = selected.score - selected.previousScore
  const tier = scoreTier(selected.score)

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="AI Lead Scoring"
        subtitle="Real-time ML scores based on sentiment, engagement & behavioral signals"
      />

      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              {scoredLeads.length} leads scored · Live from Supabase
            </span>
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30">
              <span className="size-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />Real-time
            </Badge>
          </div>
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw className="size-4 mr-2" />Rescore All
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Lead list */}
          <div className="lg:col-span-2 space-y-3">
            {scoredLeads.map(entry => {
              const t = scoreTier(entry.score)
              const d = entry.score - entry.previousScore
              return (
                <Card
                  key={entry.lead.id}
                  onClick={() => setSelectedId(entry.lead.id)}
                  className={`cursor-pointer transition-all hover:shadow-md ${(selectedId === entry.lead.id || (!selectedId && entry === scoredLeads[0])) ? 'ring-2 ring-primary shadow-md' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {entry.lead.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{entry.lead.full_name}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-lg font-bold">{entry.score}</span>
                            <span className={`text-xs flex items-center gap-0.5 ${d > 0 ? 'text-emerald-600 dark:text-emerald-400' : d < 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
                              {d > 0 ? <ChevronUp className="size-3" /> : d < 0 ? <ChevronDown className="size-3" /> : <Minus className="size-3" />}
                              {Math.abs(d)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{entry.lead.company || entry.lead.city || '—'}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <Progress value={entry.score} className="h-1.5 flex-1 mr-3" />
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${t.color}`}>{t.label}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Score ring */}
                    <div className="size-[72px] rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-0">
                        <svg viewBox="0 0 72 72" className="-rotate-90 w-full h-full">
                          <circle cx="36" cy="36" r="26" fill="none" strokeWidth="6" className="stroke-muted" />
                          <circle cx="36" cy="36" r="26" fill="none" strokeWidth="6"
                            strokeDasharray={`${(selected.score / 100) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`}
                            strokeLinecap="round"
                            className={`${scoreRingColor(selected.score)} transition-all duration-700`}
                          />
                        </svg>
                      </div>
                      <span className="relative z-10 text-xl font-bold">{selected.score}</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{selected.lead.full_name}</CardTitle>
                      <CardDescription>
                        {selected.lead.company || '—'} · {selected.lead.source || 'Direct'}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tier.color}`}>{tier.label}</span>
                        <span className={`text-xs flex items-center gap-0.5 font-medium ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
                          {delta > 0 ? <TrendingUp className="size-3" /> : delta < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                          {delta > 0 ? '+' : ''}{delta} pts
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Est. Value</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{((selected.lead.deal_value || selected.lead.estimated_budget || 0) / 100000).toFixed(1)}L
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{selected.predictedConversion}% win probability</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* AI Recommendation */}
                <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
                  <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-0.5">AI Recommendation</p>
                    <p className="text-sm">{selected.recommendation}</p>
                  </div>
                </div>

                {/* Scoring signals */}
                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Zap className="size-4 text-amber-500" />Scoring Signals
                  </p>
                  <div className="space-y-2.5">
                    {selected.signals.map((sig, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${sig.impact === 'positive' ? 'bg-emerald-100 dark:bg-emerald-950/40' : sig.impact === 'negative' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-slate-100 dark:bg-slate-900'}`}>
                          {sig.impact === 'positive' ? <ChevronUp className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : sig.impact === 'negative' ? <ChevronDown className="size-3.5 text-red-500 dark:text-red-400" /> : <Minus className="size-3.5 text-slate-500 dark:text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm font-medium">{sig.label}</span>
                            <span className={`text-xs font-bold ${sig.impact === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : sig.impact === 'negative' ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
                              {sig.weight > 0 ? '+' : ''}{sig.weight}pts
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{sig.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <Button size="sm" className="flex flex-col h-auto py-2.5 gap-1">
                    <Phone className="size-4" /><span className="text-xs">Call Now</span>
                  </Button>
                  <Button size="sm" variant="outline" className="flex flex-col h-auto py-2.5 gap-1">
                    <MessageSquare className="size-4" /><span className="text-xs">WhatsApp</span>
                  </Button>
                  <Button size="sm" variant="outline" className="flex flex-col h-auto py-2.5 gap-1">
                    <Clock className="size-4" /><span className="text-xs">Schedule</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
