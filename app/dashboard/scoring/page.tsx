'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  RefreshCw, ChevronUp, ChevronDown, Zap, Loader2, History
} from 'lucide-react'
import type { Lead } from '@/hooks/use-realtime-leads'
import type { Interaction } from '@/hooks/use-realtime-interactions'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ── Score history record type ─────────────────────────────────────────────────
interface ScoreHistoryRecord {
  id: string
  lead_id: string
  score: number
  previous_score: number | null
  delta: number | null
  tier: string
  reasons: { label: string; weight: number; detail: string }[]
  triggered_by: string | null
  created_at: string
}

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

  // Deterministic delta derived from lead ID character sum (no Math.random)
  const idSum = lead.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const deterministicDelta = (idSum % 17) - 8  // Range: -8 to +8
  const previousScore = Math.max(5, Math.min(100, finalScore + deterministicDelta))

  const tier: 'hot' | 'warm' | 'cold' | 'lost' =
    lead.status === 'closed_lost' ? 'lost' :
    finalScore >= 75 ? 'hot' :
    finalScore >= 50 ? 'warm' : 'cold'

  // Deterministic win probability — directly derived from score, no randomness
  const predictedConversion = Math.min(95, Math.max(5, Math.round(finalScore * 0.9)))

  const recommendation =
    tier === 'hot' ? 'Call now — high intent. Offer a time-limited deal to close this week.' :
    tier === 'warm' ? 'Re-engage with a personalised follow-up. Send proposal or case study.' :
    tier === 'cold' ? 'Low engagement — try a WhatsApp nurture sequence or reassign.' :
    'Deal lost — archive and analyse for next quarter learnings.'

  return { score: finalScore, previousScore: Math.round(previousScore), tier, signals, predictedConversion, recommendation }
}

function scoreTier(score: number) {
  if (score >= 80) return { label: 'Hot Lead',  color: 'bg-foreground/10 text-foreground border-border' }
  if (score >= 55) return { label: 'Warm Lead', color: 'bg-muted text-muted-foreground border-border' }
  if (score >= 30) return { label: 'Cold Lead', color: 'bg-muted/60 text-muted-foreground border-border' }
  return { label: 'At Risk', color: 'bg-muted/30 text-muted-foreground border-border' }
}

function scoreRingColor(score: number) {
  if (score >= 80) return 'stroke-foreground'
  if (score >= 55) return 'stroke-foreground/70'
  if (score >= 30) return 'stroke-foreground/40'
  return 'stroke-muted-foreground'
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AILeadScoringPage() {
  const { leads, isLoading: leadsLoading, refetch } = useRealtimeLeads()
  const { interactions, isLoading: intLoading } = useRealtimeInteractions()
  const isLoading = leadsLoading || intLoading

  // Score history map: lead_id → most recent history record
  const [historyMap, setHistoryMap] = useState<Record<string, ScoreHistoryRecord>>({})
  const [saving, setSaving] = useState(false)

  // Load latest score history per lead from DB
  const loadHistory = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('lead_score_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (data) {
      // Keep only the most recent record per lead (already sorted desc)
      const map: Record<string, ScoreHistoryRecord> = {}
      for (const row of data as ScoreHistoryRecord[]) {
        if (!map[row.lead_id]) map[row.lead_id] = row
      }
      setHistoryMap(map)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // Save computed scores to DB (called on rescore)
  const saveScores = useCallback(async (scored: typeof scoredLeads) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const rows = scored.map(entry => ({
      lead_id: entry.lead.id,
      user_id: user.id,
      score: entry.score,
      previous_score: historyMap[entry.lead.id]?.score ?? null,
      tier: entry.tier,
      reasons: entry.signals.map(s => ({ label: s.label, weight: s.weight, detail: s.detail })),
      triggered_by: 'manual_rescore',
    }))

    const { error } = await supabase.from('lead_score_history').insert(rows)
    if (error) {
      // Table may not exist yet — show friendly message
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        toast.info('Run the DB migration to enable score history tracking.')
      }
    } else {
      toast.success('Scores saved to history')
      loadHistory()
    }
    setSaving(false)
  }, [historyMap, loadHistory])

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
  // Use real DB historical previous score if available, otherwise no delta
  const dbHistory = historyMap[selected.lead.id]
  const delta = dbHistory ? selected.score - dbHistory.score : 0
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
            <BrainCircuit className="size-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {scoredLeads.length} leads scored · Live from Supabase
            </span>
            <Badge variant="outline" className="text-xs">
              <span className="size-2 rounded-full bg-foreground/60 mr-1.5" />Real-time
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              onClick={async () => { await refetch(); await saveScores(scoredLeads) }}
              disabled={saving}
            >
              {saving
                ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</>
                : <><RefreshCw className="size-4 mr-2" />Rescore &amp; Save</>}
            </Button>
            {Object.keys(historyMap).length > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <History className="size-3" />
                {Object.keys(historyMap).length} scored
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Lead list */}
          <div className="lg:col-span-2 space-y-3">
            {scoredLeads.map(entry => {
              const t = scoreTier(entry.score)
              // Real delta from DB history
              const hist = historyMap[entry.lead.id]
              const d = hist ? entry.score - hist.score : 0
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
                    <p className="text-xl font-bold">
                      ₹{((selected.lead.deal_value || selected.lead.estimated_budget || 0) / 100000).toFixed(1)}L
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{selected.predictedConversion}% win probability</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* AI Recommendation */}
                <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
                  <BrainCircuit className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary mb-0.5">AI Recommendation</p>
                    <p className="text-sm">{selected.recommendation}</p>
                  </div>
                </div>

                {/* Scoring signals */}
                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Zap className="size-4 text-muted-foreground" />Scoring Signals
                  </p>
                  <div className="space-y-2.5">
                    {selected.signals.map((sig, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="size-6 rounded-full flex items-center justify-center shrink-0 bg-muted border border-border">
                          {sig.impact === 'positive' ? <ChevronUp className="size-3.5 text-foreground" /> : sig.impact === 'negative' ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <Minus className="size-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm font-medium">{sig.label}</span>
                            <span className="text-xs font-bold text-muted-foreground">
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

            {/* Score History Card — shows real DB history */}
            {dbHistory && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="size-4 text-muted-foreground" />
                    Score History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <span className="font-semibold">{dbHistory.score} pts</span>
                      {dbHistory.previous_score != null && (
                        <span className="text-muted-foreground ml-2">
                          ({dbHistory.score > dbHistory.previous_score ? '+' : ''}{dbHistory.score - dbHistory.previous_score} from {dbHistory.previous_score})
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(dbHistory.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {Array.isArray(dbHistory.reasons) && dbHistory.reasons.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>{r.label}</span>
                      <span className="font-medium">{r.weight > 0 ? '+' : ''}{r.weight}pts</span>
                    </div>
                  ))}
                  {dbHistory.triggered_by && (
                    <p className="text-[10px] text-muted-foreground pt-1 border-t">
                      Triggered by: <span className="font-medium">{dbHistory.triggered_by.replace(/_/g, ' ')}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
