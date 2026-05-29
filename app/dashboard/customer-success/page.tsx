'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Heart, Activity, AlertTriangle, ShieldAlert, Smile, RefreshCw,
  Calendar, DollarSign, Loader2, Save, CheckCircle2, Phone,
  MessageSquare, TrendingUp, Users, Zap, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import type { Lead } from '@/hooks/use-realtime-leads'

interface HealthSnapshot {
  id: string
  lead_id: string
  health_score: number
  risk_level: 'good' | 'watch' | 'danger'
  reasons: string[]
  next_best_action: string | null
  created_at: string
}

interface RenewalOpportunity {
  id: string
  lead_id: string
  renewal_date: string | null
  expected_value: number | null
  status: 'open' | 'won' | 'lost' | 'canceled'
  notes: string | null
}

function calcHealth(lead: Lead): { health_score: number; risk_level: 'good' | 'watch' | 'danger'; reasons: string[]; next_best_action: string } {
  let score = 60
  const reasons: string[] = []

  if (lead.sentiment_score >= 0.5) { score += 20; reasons.push('Highly positive communication sentiment') }
  else if (lead.sentiment_score < 0) { score -= 20; reasons.push('Negative sentiment patterns identified') }

  if (lead.gst_status === 'verified' || lead.pan_status === 'verified') { score += 15; reasons.push('KYC and compliance verified') }

  if (lead.last_contacted_at) {
    const days = Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86400000)
    if (days <= 7) { score += 15; reasons.push('Active communication in last week') }
    else if (days > 30) { score -= 20; reasons.push('No interaction for over 30 days') }
  } else { score -= 15; reasons.push('No interaction history recorded') }

  if (lead.buying_intent === 'high') { score += 10; reasons.push('High buying intent detected') }

  score = Math.max(10, Math.min(100, score))
  const risk_level: 'good' | 'watch' | 'danger' = score >= 75 ? 'good' : score >= 45 ? 'watch' : 'danger'
  const next_best_action = score < 45 ? 'Escalate to Customer Success Manager for immediate callback' :
    score < 75 ? 'Schedule regular bi-weekly check-in call' :
    'Send feedback survey and initiate renewal discussions'

  return { health_score: score, risk_level, reasons, next_best_action }
}

function RiskBadge({ level }: { level: 'good' | 'watch' | 'danger' }) {
  if (level === 'good') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Healthy</Badge>
  if (level === 'watch') return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Watch</Badge>
  return <Badge className="bg-red-100 text-red-700 border-red-200">At Risk</Badge>
}

export default function CustomerSuccessPage() {
  const { leads, isLoading: leadsLoading, refetch } = useRealtimeLeads()
  const [snapshots, setSnapshots] = useState<HealthSnapshot[]>([])
  const [renewals, setRenewals] = useState<RenewalOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editScore, setEditScore] = useState(75)
  const [editRisk, setEditRisk] = useState<'good' | 'watch' | 'danger'>('good')
  const [editReasons, setEditReasons] = useState('')
  const [editAction, setEditAction] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [renewalValue, setRenewalValue] = useState('')
  const [renewalStatus, setRenewalStatus] = useState<'open' | 'won' | 'lost' | 'canceled'>('open')
  const [renewalNotes, setRenewalNotes] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data: snap }, { data: ren }] = await Promise.all([
        (supabase as any).from('customer_health_snapshots').select('*'),
        (supabase as any).from('renewal_opportunities').select('*'),
      ])
      if (snap) setSnapshots(snap)
      if (ren) setRenewals(ren)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    const ch = supabase.channel('customer-success-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_health_snapshots' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'renewal_opportunities' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchData])

  const customers = useMemo(() => leads.map(lead => {
    const saved = snapshots.find(s => s.lead_id === lead.id)
    const renewal = renewals.find(r => r.lead_id === lead.id) || null
    const health = saved ? { ...saved, isCustom: true } : { ...calcHealth(lead), isCustom: false }
    return { lead, health, renewal }
  }), [leads, snapshots, renewals])

  const active = useMemo(() => customers.find(c => c.lead.id === selectedId) || customers[0], [customers, selectedId])

  useEffect(() => {
    if (!active) return
    setEditScore(active.health.health_score)
    setEditRisk(active.health.risk_level)
    setEditReasons(active.health.reasons.join(', '))
    setEditAction(active.health.next_best_action || '')
    setRenewalDate(active.renewal?.renewal_date || '')
    setRenewalValue(String(active.renewal?.expected_value || ''))
    setRenewalStatus(active.renewal?.status || 'open')
    setRenewalNotes(active.renewal?.notes || '')
  }, [active?.lead.id])

  const saveHealth = async () => {
    if (!active) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      user_id: user.id,
      lead_id: active.lead.id,
      health_score: editScore,
      risk_level: editRisk,
      reasons: editReasons.split(',').map(r => r.trim()).filter(Boolean),
      next_best_action: editAction || null,
    }

    const existing = snapshots.find(s => s.lead_id === active.lead.id)
    const { error } = existing
      ? await (supabase as any).from('customer_health_snapshots').update(payload).eq('id', existing.id)
      : await (supabase as any).from('customer_health_snapshots').insert(payload)

    if (error) toast.error(error.message)
    else { toast.success('Health snapshot saved!'); fetchData() }
    setSaving(false)
  }

  const saveRenewal = async () => {
    if (!active) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      user_id: user.id,
      lead_id: active.lead.id,
      renewal_date: renewalDate || null,
      expected_value: renewalValue ? Number(renewalValue) : null,
      status: renewalStatus,
      notes: renewalNotes || null,
    }

    const existing = renewals.find(r => r.lead_id === active.lead.id)
    const { error } = existing
      ? await (supabase as any).from('renewal_opportunities').update(payload).eq('id', existing.id)
      : await (supabase as any).from('renewal_opportunities').insert(payload)

    if (error) toast.error(error.message)
    else { toast.success('Renewal details saved!'); fetchData() }
    setSaving(false)
  }

  const avgHealth = customers.length ? Math.round(customers.reduce((s, c) => s + c.health.health_score, 0) / customers.length) : 0
  const healthy = customers.filter(c => c.health.risk_level === 'good').length
  const watch = customers.filter(c => c.health.risk_level === 'watch').length
  const danger = customers.filter(c => c.health.risk_level === 'danger').length
  const openRenewals = renewals.filter(r => r.status === 'open').length

  if (leadsLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="Customer Success" subtitle="Loading account health data…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="Customer Success" subtitle="No customers yet" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Heart className="size-16 opacity-20" />
          <p>Add leads to track customer health</p>
          <Button variant="outline" onClick={refetch}><RefreshCw className="size-4 mr-2" />Refresh</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Customer Success"
        subtitle="Real-time health monitoring, renewal tracking & success management"
      />
      <main className="flex-1 p-4 md:p-6 space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Avg Health', value: `${avgHealth}%`, icon: Activity, color: 'text-foreground' },
            { label: 'Healthy Accounts', value: healthy, icon: Smile, color: 'text-emerald-600' },
            { label: 'Watch / At Risk', value: watch, icon: AlertTriangle, color: 'text-amber-500' },
            { label: 'Critical Danger', value: danger, icon: ShieldAlert, color: 'text-red-500' },
          ].map(m => (
            <Card key={m.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                </div>
                <m.icon className={`size-6 ${m.color} opacity-70`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Open Renewals Banner */}
        {openRenewals > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <Zap className="size-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">{openRenewals} Open Renewal{openRenewals > 1 ? 's' : ''} Pending</p>
              <p className="text-xs text-muted-foreground">Review and close renewal opportunities below.</p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Customer List */}
          <div className="lg:col-span-2 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Customer Accounts ({customers.length})</p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {customers.map(({ lead, health, renewal }) => {
                const isSelected = active?.lead.id === lead.id
                return (
                  <Card
                    key={lead.id}
                    onClick={() => setSelectedId(lead.id)}
                    className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                          {lead.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate">{lead.full_name}</p>
                            <RiskBadge level={health.risk_level} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{lead.company || lead.city || '—'}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Progress value={health.health_score} className="h-1.5 flex-1" />
                            <span className="text-xs font-bold text-muted-foreground shrink-0">{health.health_score}%</span>
                          </div>
                          {renewal?.renewal_date && (
                            <p className="text-[11px] text-primary mt-1 flex items-center gap-1">
                              <Calendar className="size-3" />
                              Renewal: {format(new Date(renewal.renewal_date), 'dd MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Detail Panel */}
          {active && (
            <div className="lg:col-span-3 space-y-4">
              {/* Health Header */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{active.lead.full_name}</CardTitle>
                      <CardDescription>{active.lead.company || '—'} · {active.lead.source || 'Direct'}</CardDescription>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{active.health.health_score}%</div>
                      <RiskBadge level={active.health.risk_level} />
                    </div>
                  </div>
                  {active.health.next_best_action && (
                    <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mt-2">
                      <ArrowRight className="size-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm">{active.health.next_best_action}</p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1.5"><Phone className="size-3.5" />Call</Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5"><MessageSquare className="size-3.5" />WhatsApp</Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5"><TrendingUp className="size-3.5" />Pipeline</Button>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="health" className="space-y-4">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="health" className="gap-1.5"><Heart className="size-3.5" />Health</TabsTrigger>
                  <TabsTrigger value="renewal" className="gap-1.5"><Calendar className="size-3.5" />Renewal</TabsTrigger>
                </TabsList>

                {/* Health Edit */}
                <TabsContent value="health" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Edit Health Snapshot</CardTitle>
                      <CardDescription className="text-xs">Override the auto-calculated health score for this customer</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Health Score: <span className="font-bold text-primary">{editScore}%</span></Label>
                        </div>
                        <input type="range" min={0} max={100} value={editScore}
                          onChange={e => setEditScore(Number(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Risk Level</Label>
                        <Select value={editRisk} onValueChange={v => setEditRisk(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">🟢 Healthy</SelectItem>
                            <SelectItem value="watch">🟡 Watch</SelectItem>
                            <SelectItem value="danger">🔴 At Risk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Reasons (comma separated)</Label>
                        <Input value={editReasons} onChange={e => setEditReasons(e.target.value)} placeholder="e.g. Active usage, pending renewal" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Next Best Action</Label>
                        <Input value={editAction} onChange={e => setEditAction(e.target.value)} placeholder="e.g. Schedule quarterly review call" />
                      </div>

                      <Button onClick={saveHealth} disabled={saving} className="w-full gap-2">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Save Health Snapshot
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Health reasons display */}
                  {active.health.reasons.length > 0 && (
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Health Factors</p>
                        {active.health.reasons.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                            {r}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Renewal Edit */}
                <TabsContent value="renewal" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="size-4" />Renewal Opportunity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Renewal Date</Label>
                          <Input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Expected Value (₹)</Label>
                          <Input type="number" value={renewalValue} onChange={e => setRenewalValue(e.target.value)} placeholder="500000" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={renewalStatus} onValueChange={v => setRenewalStatus(v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">🔵 Open</SelectItem>
                            <SelectItem value="won">🟢 Won</SelectItem>
                            <SelectItem value="lost">🔴 Lost</SelectItem>
                            <SelectItem value="canceled">⚫ Canceled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Notes</Label>
                        <Input value={renewalNotes} onChange={e => setRenewalNotes(e.target.value)} placeholder="Add renewal notes…" />
                      </div>

                      <Button onClick={saveRenewal} disabled={saving} className="w-full gap-2">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Save Renewal Details
                      </Button>

                      {/* Open renewals summary */}
                      {renewals.filter(r => r.status === 'open').length > 0 && (
                        <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                          <p className="text-xs font-semibold mb-2">All Open Renewals</p>
                          {renewals.filter(r => r.status === 'open').slice(0, 5).map(r => {
                            const lead = leads.find(l => l.id === r.lead_id)
                            return (
                              <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                <span className="font-medium">{lead?.full_name || 'Unknown'}</span>
                                <span className="text-muted-foreground">{r.renewal_date ? format(new Date(r.renewal_date), 'dd MMM') : 'No date'}</span>
                                <span className="font-bold text-primary">₹{((r.expected_value || 0) / 100000).toFixed(1)}L</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
