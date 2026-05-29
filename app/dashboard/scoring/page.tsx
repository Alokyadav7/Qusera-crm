'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BrainCircuit, TrendingUp, TrendingDown, Minus,
  Phone, MessageSquare, Clock, Star,
  RefreshCw, ChevronUp, ChevronDown, Zap, Loader2, History,
  Heart, ShieldAlert, AlertTriangle, Smile, Calendar, Save, DollarSign, Activity
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

// ── Customer Health & Renewal Types ───────────────────────────────────────────
interface CustomerHealthSnapshot {
  id?: string
  user_id?: string
  lead_id: string
  health_score: number
  risk_level: 'good' | 'watch' | 'danger'
  reasons: string[]
  next_best_action: string | null
  created_at?: string
}

interface RenewalOpportunity {
  id?: string
  user_id?: string
  lead_id: string
  renewal_date: string | null
  expected_value: number | null
  status: 'open' | 'won' | 'lost' | 'canceled'
  notes: string | null
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

// ── Deterministic customer health scoring function ───────────────────────────
function calculateDynamicHealth(lead: Lead) {
  let score = 60
  const reasons: string[] = []

  // Sentiment influence
  if (lead.sentiment_score >= 0.5) {
    score += 20
    reasons.push('Highly positive communication sentiment')
  } else if (lead.sentiment_score < 0) {
    score -= 20
    reasons.push('Negative sentiment patterns identified in messages')
  }

  // Profile status / Verification
  if (lead.gst_status === 'verified' || lead.pan_status === 'verified') {
    score += 15
    reasons.push('KYC and compliance registration complete')
  }

  // Recency of contact
  if (lead.last_contacted_at) {
    const days = Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86400000)
    if (days <= 7) {
      score += 15
      reasons.push('Active communication in the last week')
    } else if (days > 30) {
      score -= 20
      reasons.push('No logged interactions for over 30 days')
    }
  } else {
    score -= 15
    reasons.push('No interaction history recorded')
  }

  score = Math.max(10, Math.min(100, score))
  const risk_level: 'good' | 'watch' | 'danger' = score >= 75 ? 'good' : score >= 45 ? 'watch' : 'danger'
  const next_best_action = score < 45 ? 'Escalate to Customer Success Manager for immediate callback' :
                          score < 75 ? 'Schedule regular bi-weekly check-in call' :
                          'Send feedback survey and initiate renewal discussions'

  return {
    health_score: score,
    risk_level,
    reasons,
    next_best_action
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AILeadScoringPage() {
  const { leads, isLoading: leadsLoading, refetch } = useRealtimeLeads()
  const { interactions, isLoading: intLoading } = useRealtimeInteractions()
  const isLoading = leadsLoading || intLoading

  // Lead Scoring States
  const [historyMap, setHistoryMap] = useState<Record<string, ScoreHistoryRecord>>({})
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Customer Success States
  const [healthSnapshots, setHealthSnapshots] = useState<CustomerHealthSnapshot[]>([])
  const [renewalOps, setRenewalOps] = useState<RenewalOpportunity[]>([])
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [selectedHealthId, setSelectedHealthId] = useState<string | null>(null)

  // Customer Success Form Edit States
  const [customHealthScore, setCustomHealthScore] = useState<number>(75)
  const [customRiskLevel, setCustomRiskLevel] = useState<'good' | 'watch' | 'danger'>('good')
  const [customReasons, setCustomReasons] = useState<string>('')
  const [customNextAction, setCustomNextAction] = useState<string>('')

  // Renewal Form Edit States
  const [renewalDate, setRenewalDate] = useState<string>('')
  const [renewalValue, setRenewalValue] = useState<string>('')
  const [renewalStatus, setRenewalStatus] = useState<'open' | 'won' | 'lost' | 'canceled'>('open')
  const [renewalNotes, setRenewalNotes] = useState<string>('')

  // Load latest score history per lead from DB
  const loadHistory = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('lead_score_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (data) {
      const map: Record<string, ScoreHistoryRecord> = {}
      for (const row of data as ScoreHistoryRecord[]) {
        if (!map[row.lead_id]) map[row.lead_id] = row
      }
      setHistoryMap(map)
    }
  }, [])

  // Load customer health and renewal opportunities
  const fetchHealthData = useCallback(async () => {
    setLoadingHealth(true)
    try {
      const supabase = createClient()
      const { data: snapshotData } = await (supabase as any)
        .from('customer_health_snapshots')
        .select('*')
      if (snapshotData) setHealthSnapshots(snapshotData)

      const { data: renewalData } = await (supabase as any)
        .from('renewal_opportunities')
        .select('*')
      if (renewalData) setRenewalOps(renewalData)
    } catch (err) {
      console.error('Error loading health data:', err)
    } finally {
      setLoadingHealth(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
    fetchHealthData()
  }, [loadHistory, fetchHealthData])

  // Save computed scores to DB (called on rescore)
  const saveScores = useCallback(async (scored: any[]) => {
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
      reasons: entry.signals.map((s: any) => ({ label: s.label, weight: s.weight, detail: s.detail })),
      triggered_by: 'manual_rescore',
    }))

    const { error } = await (supabase as any).from('lead_score_history').insert(rows)
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        toast.info('Run the DB migration to enable score history tracking.')
      } else {
        toast.error('Failed to save scores: ' + error.message)
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

  // Customers calculation for Customer Success view
  const customers = useMemo(() => {
    return leads.map(lead => {
      const savedSnapshot = healthSnapshots.find(s => s.lead_id === lead.id)
      const savedRenewal = renewalOps.find(o => o.lead_id === lead.id)
      
      const healthInfo = savedSnapshot 
        ? {
            health_score: savedSnapshot.health_score,
            risk_level: savedSnapshot.risk_level,
            reasons: savedSnapshot.reasons,
            next_best_action: savedSnapshot.next_best_action,
            isCustom: true
          }
        : {
            ...calculateDynamicHealth(lead),
            isCustom: false
          }

      return {
        lead,
        health: healthInfo,
        renewal: savedRenewal || null
      }
    })
  }, [leads, healthSnapshots, renewalOps])

  // Set default details selection for Leads — SAFE: guard against empty array
  const selectedLeadEntry = scoredLeads.find(e => e.lead.id === selectedId) ?? scoredLeads[0] ?? null
  const dbHistory = selectedLeadEntry ? historyMap[selectedLeadEntry.lead.id] : null
  const delta = dbHistory && selectedLeadEntry ? selectedLeadEntry.score - dbHistory.score : 0

  // Set default details selection for Customer Health
  const activeCustomer = useMemo(() => {
    return customers.find(c => c.lead.id === selectedHealthId) ?? customers[0] ?? null
  }, [customers, selectedHealthId])

  // Synchronize form values when selected customer changes
  useEffect(() => {
    if (!activeCustomer) return
    setCustomHealthScore(activeCustomer.health.health_score)
    setCustomRiskLevel(activeCustomer.health.risk_level)
    setCustomReasons(activeCustomer.health.reasons?.join(', ') ?? '')
    setCustomNextAction(activeCustomer.health.next_best_action ?? '')
    if (activeCustomer.renewal) {
      setRenewalDate(activeCustomer.renewal.renewal_date ?? '')
      setRenewalValue(String(activeCustomer.renewal.expected_value ?? ''))
      setRenewalStatus(activeCustomer.renewal.status)
      setRenewalNotes(activeCustomer.renewal.notes ?? '')
    } else {
      setRenewalDate('')
      setRenewalValue('')
      setRenewalStatus('open')
      setRenewalNotes('')
    }
  }, [activeCustomer])

  // Save/Update Customer Health Snapshot to Supabase
  const handleSaveHealth = async () => {
    if (!activeCustomer) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Session expired. Please log in.')
        return
      }

      const reasonsArray = customReasons
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0)

      const payload = {
        user_id: user.id,
        lead_id: activeCustomer.lead.id,
        health_score: Number(customHealthScore),
        risk_level: customRiskLevel,
        reasons: reasonsArray,
        next_best_action: customNextAction || null
      }

      const existing = healthSnapshots.find(s => s.lead_id === activeCustomer.lead.id)
      let error;
      if (existing) {
        const { error: err } = await (supabase as any)
          .from('customer_health_snapshots')
          .update(payload)
          .eq('id', existing.id)
        error = err
      } else {
        const { error: err } = await (supabase as any)
          .from('customer_health_snapshots')
          .insert(payload)
        error = err
      }

      if (error) {
        toast.error('Failed to save health snapshot: ' + error.message)
      } else {
        toast.success(`Health snapshot for ${activeCustomer.lead.full_name} updated successfully!`)
        fetchHealthData()
      }
    } catch (err: any) {
      toast.error('Error saving health: ' + err.message)
    }
  }

  // Save/Update Renewal Opportunity to Supabase
  const handleSaveRenewal = async () => {
    if (!activeCustomer) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Session expired. Please log in.')
        return
      }

      const payload = {
        user_id: user.id,
        lead_id: activeCustomer.lead.id,
        renewal_date: renewalDate || null,
        expected_value: renewalValue ? Number(renewalValue) : null,
        status: renewalStatus,
        notes: renewalNotes || null
      }

      const existing = renewalOps.find(o => o.lead_id === activeCustomer.lead.id)
      let error;
      if (existing) {
        const { error: err } = await (supabase as any)
          .from('renewal_opportunities')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        error = err
      } else {
        const { error: err } = await (supabase as any)
          .from('renewal_opportunities')
          .insert({ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        error = err
      }

      if (error) {
        toast.error('Failed to save renewal details: ' + error.message)
      } else {
        toast.success('Renewal details synchronized with database.')
        fetchHealthData()
      }
    } catch (err: any) {
      toast.error('Error saving renewal details: ' + err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="AI Lead Scoring & Success" subtitle="Loading live scores from Supabase…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (scoredLeads.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="AI Lead Scoring & Success" subtitle="No leads in database yet" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <BrainCircuit className="size-16 opacity-30" />
          <p>Add leads via the Contacts tab to see AI scores</p>
          <Button variant="outline" onClick={refetch}><RefreshCw className="mr-2 size-4" />Refresh</Button>
        </div>
      </div>
    )
  }

  // Summary Metrics calculations for health dashboard — guard for empty array
  const avgHealth = customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + c.health.health_score, 0) / customers.length) : 0
  const countHealthy = customers.filter(c => c.health.risk_level === 'good').length
  const countWatch = customers.filter(c => c.health.risk_level === 'watch').length
  const countDanger = customers.filter(c => c.health.risk_level === 'danger').length

  // Guard: if no selected lead entry (leads loaded but filtered out) — show empty
  if (!selectedLeadEntry) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="AI Lead Scoring & Success" subtitle="No leads to score yet" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <BrainCircuit className="size-16 opacity-30" />
          <p>All leads are closed-lost or no leads exist yet.</p>
          <Button variant="outline" onClick={refetch}><RefreshCw className="mr-2 size-4" />Refresh</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="AI Intelligence & Success Command Center"
        subtitle="Real-time ML lead scoring and interactive customer success health management"
      />

      <main className="flex-1 p-4 md:p-6 space-y-6">
        <Tabs defaultValue="scoring" className="w-full space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl p-1 bg-muted">
            <TabsTrigger value="scoring" className="rounded-xl flex items-center gap-1.5">
              <BrainCircuit className="size-4" /> Lead Scoring
            </TabsTrigger>
            <TabsTrigger value="health" className="rounded-xl flex items-center gap-1.5">
              <Heart className="size-4 text-red-500" /> Customer Success
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: LEAD SCORING ── */}
          <TabsContent value="scoring" className="space-y-6">
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
                        <div className="size-[72px] rounded-full flex items-center justify-center relative">
                          <div className="absolute inset-0">
                            <svg viewBox="0 0 72 72" className="-rotate-90 w-full h-full">
                              <circle cx="36" cy="36" r="26" fill="none" strokeWidth="6" className="stroke-muted" />
                              <circle cx="36" cy="36" r="26" fill="none" strokeWidth="6"
                                strokeDasharray={`${(selectedLeadEntry.score / 100) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`}
                                strokeLinecap="round"
                                className={`${scoreRingColor(selectedLeadEntry.score)} transition-all duration-700`}
                              />
                            </svg>
                          </div>
                          <span className="relative z-10 text-xl font-bold">{selectedLeadEntry.score}</span>
                        </div>
                        <div>
                          <CardTitle className="text-xl">{selectedLeadEntry.lead.full_name}</CardTitle>
                          <CardDescription>
                            {selectedLeadEntry.lead.company || '—'} · {selectedLeadEntry.lead.source || 'Direct'}
                          </CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${scoreTier(selectedLeadEntry.score).color}`}>{scoreTier(selectedLeadEntry.score).label}</span>
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
                          ₹{((selectedLeadEntry.lead.deal_value || selectedLeadEntry.lead.estimated_budget || 0) / 100000).toFixed(1)}L
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{selectedLeadEntry.predictedConversion}% win probability</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* AI Recommendation */}
                    <div className="flex items-start gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
                      <BrainCircuit className="size-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-0.5">AI Recommendation</p>
                        <p className="text-sm">{selectedLeadEntry.recommendation}</p>
                      </div>
                    </div>

                    {/* Scoring signals */}
                    <div>
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Zap className="size-4 text-muted-foreground" />Scoring Signals
                      </p>
                      <div className="space-y-2.5">
                        {selectedLeadEntry.signals.map((sig: any, i: number) => (
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

                {/* Score History Card */}
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
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 2: CUSTOMER SUCCESS & HEALTH ── */}
          <TabsContent value="health" className="space-y-6">
            {/* KPI metric grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Avg Health Score</span>
                    <p className="text-2xl font-bold tracking-tight text-foreground">{avgHealth}%</p>
                  </div>
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Activity className="size-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Healthy Accounts</span>
                    <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{countHealthy}</p>
                  </div>
                  <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Smile className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Watch / At Risk</span>
                    <p className="text-2xl font-bold tracking-tight text-amber-500">{countWatch}</p>
                  </div>
                  <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="size-5 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Critical Danger</span>
                    <p className="text-2xl font-bold tracking-tight text-red-500">{countDanger}</p>
                  </div>
                  <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="size-5 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              {/* Customer Account list */}
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Customer Accounts</p>
                {customers.map(item => {
                  const isSelected = activeCustomer.lead.id === item.lead.id
                  const score = item.health.health_score
                  const risk = item.health.risk_level
                  
                  return (
                    <Card
                      key={item.lead.id}
                      onClick={() => setSelectedHealthId(item.lead.id)}
                      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-9 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                              {item.lead.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate leading-none mb-1">{item.lead.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.lead.company || 'Individual Account'}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-sm font-bold">{score}%</span>
                              <div className={`size-2.5 rounded-full ${risk === 'good' ? 'bg-emerald-500' : risk === 'watch' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            </div>
                            {item.renewal?.renewal_date && (
                              <p className="text-[10px] text-muted-foreground">Renews: {new Date(item.renewal.renewal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Customer success details & synchronization */}
              <div className="lg:col-span-3 space-y-6">
                {activeCustomer && (
                  <>
                    {/* Health Card */}
                    <Card className="border-2 border-red-500/10">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Heart className="size-5 text-red-500" />
                          Health details for {activeCustomer.lead.full_name}
                        </CardTitle>
                        <CardDescription>
                          Custom configurations are saved directly to `customer_health_snapshots` table
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Dynamic status overview */}
                        <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-muted/30 border border-border">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Current Score</span>
                            <span className="text-lg font-bold flex items-center gap-1.5">
                              {customHealthScore}%
                              <Badge variant="outline" className={`text-[10px] uppercase font-bold ${customRiskLevel === 'good' ? 'text-emerald-600 bg-emerald-500/5' : customRiskLevel === 'watch' ? 'text-amber-600 bg-amber-500/5' : 'text-red-600 bg-red-500/5'}`}>
                                {customRiskLevel}
                              </Badge>
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-0.5">Source Method</span>
                            <span className="text-sm font-semibold text-foreground">
                              {activeCustomer.health.isCustom ? 'Manual Database Row' : 'Calculated Live (Fallback)'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive sliders/inputs */}
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="health-score-slider" className="text-xs font-semibold">Custom Health Score ({customHealthScore}%)</Label>
                              <span className="text-xs font-mono">{customHealthScore}/100</span>
                            </div>
                            <input
                              id="health-score-slider"
                              type="range" min="0" max="100"
                              value={customHealthScore}
                              onChange={e => setCustomHealthScore(Number(e.target.value))}
                              className="w-full accent-foreground bg-muted h-1.5 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="risk-level-select" className="text-xs font-semibold">Risk Category Status</Label>
                            <Select
                              value={customRiskLevel}
                              onValueChange={(val: any) => setCustomRiskLevel(val)}
                            >
                              <SelectTrigger id="risk-level-select" className="rounded-xl">
                                <SelectValue placeholder="Select risk status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="good">Good (Healthy)</SelectItem>
                                <SelectItem value="watch">Watch (Mild Risk)</SelectItem>
                                <SelectItem value="danger">Danger (High Churn Risk)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="reasons-input" className="text-xs font-semibold">Positive/Negative Health Signals (comma separated)</Label>
                            <Input
                              id="reasons-input"
                              placeholder="e.g. Completed verification, High usage logs, Late payments"
                              value={customReasons}
                              onChange={e => setCustomReasons(e.target.value)}
                              className="rounded-xl"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="next-action-input" className="text-xs font-semibold">Next Best Action Recommended</Label>
                            <Input
                              id="next-action-input"
                              placeholder="e.g. Schedule check-in call with primary stakeholder"
                              value={customNextAction}
                              onChange={e => setCustomNextAction(e.target.value)}
                              className="rounded-xl"
                            />
                          </div>

                          <Button onClick={handleSaveHealth} className="w-full rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
                            <Save className="size-4" /> Save Health Snapshot
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Renewal details */}
                    <Card className="border-2 border-emerald-500/10">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />
                          Renewals &amp; Contract Opportunities
                        </CardTitle>
                        <CardDescription>
                          Synchronized with database `renewal_opportunities` table
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="renewal-date-input" className="text-xs font-semibold">Renewal Date</Label>
                            <Input
                              id="renewal-date-input"
                              type="date"
                              value={renewalDate}
                              onChange={e => setRenewalDate(e.target.value)}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="renewal-value-input" className="text-xs font-semibold">Contract Value (₹)</Label>
                            <Input
                              id="renewal-value-input"
                              type="number"
                              placeholder="e.g. 150000"
                              value={renewalValue}
                              onChange={e => setRenewalValue(e.target.value)}
                              className="rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5 col-span-2">
                            <Label htmlFor="renewal-status-select" className="text-xs font-semibold">Contract Status</Label>
                            <Select
                              value={renewalStatus}
                              onValueChange={(val: any) => setRenewalStatus(val)}
                            >
                              <SelectTrigger id="renewal-status-select" className="rounded-xl">
                                <SelectValue placeholder="Contract Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open / Under Discussion</SelectItem>
                                <SelectItem value="won">Closed Won (Renewed)</SelectItem>
                                <SelectItem value="lost">Closed Lost</SelectItem>
                                <SelectItem value="canceled">Canceled / Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="renewal-notes-input" className="text-xs font-semibold">Contract Notes</Label>
                          <Input
                            id="renewal-notes-input"
                            placeholder="Add contract terms or renewal constraints"
                            value={renewalNotes}
                            onChange={e => setRenewalNotes(e.target.value)}
                            className="rounded-xl"
                          />
                        </div>

                        <Button onClick={handleSaveRenewal} variant="outline" className="w-full rounded-xl flex items-center justify-center gap-1.5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5">
                          <Calendar className="size-4" /> Save Renewal Details
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
