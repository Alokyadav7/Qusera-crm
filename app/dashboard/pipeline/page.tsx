'use client'

import { useState, useCallback } from 'react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, GripVertical, IndianRupee, Calendar,
  TrendingUp, ArrowRight, Trophy, AlertCircle, Clock, Target,
  Sparkles, Phone, Star, Loader2, RefreshCw
} from 'lucide-react'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import type { Lead } from '@/hooks/use-realtime-leads'
import { createClient } from '@/lib/supabase/client'

// ── Stage config ──────────────────────────────────────────────────────────────
type StageId = Lead['status']

interface Stage {
  id: StageId
  label: string
  textColor: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
}

const STAGES: Stage[] = [
  { id: 'new',         label: 'New',         textColor: 'text-slate-700',   bgColor: 'bg-slate-50',   borderColor: 'border-slate-200',  icon: <Target className="size-3.5" /> },
  { id: 'contacted',   label: 'Contacted',   textColor: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',   icon: <Phone className="size-3.5" /> },
  { id: 'interested',  label: 'Interested',  textColor: 'text-violet-700',  bgColor: 'bg-violet-50',  borderColor: 'border-violet-200', icon: <Star className="size-3.5" /> },
  { id: 'verified',    label: 'Verified',    textColor: 'text-cyan-700',    bgColor: 'bg-cyan-50',    borderColor: 'border-cyan-200',   icon: <Sparkles className="size-3.5" /> },
  { id: 'negotiation', label: 'Negotiation', textColor: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200',  icon: <TrendingUp className="size-3.5" /> },
  { id: 'closed_won',  label: 'Won ✓',       textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',icon: <Trophy className="size-3.5" /> },
  { id: 'closed_lost', label: 'Lost',        textColor: 'text-red-700',     bgColor: 'bg-red-50',     borderColor: 'border-red-200',    icon: <AlertCircle className="size-3.5" /> },
]

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function intentBadgeClass(intent: Lead['buying_intent']) {
  return intent === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
         intent === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
         'bg-slate-100 text-slate-600 border-slate-200'
}

function intentEmoji(intent: Lead['buying_intent']) {
  return intent === 'high' ? '🔥' : intent === 'medium' ? '🌡️' : '❄️'
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

// ── Deal Card ─────────────────────────────────────────────────────────────────
function DealCard({ lead, onDragStart }: { lead: Lead; onDragStart: (e: React.DragEvent, id: string) => void }) {
  const value = lead.deal_value || lead.estimated_budget || 0
  const winProb = lead.buying_intent === 'high' ? 80 : lead.buying_intent === 'medium' ? 50 : 25
  const days = daysSince(lead.last_contacted_at)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      className="group bg-white dark:bg-card border border-border rounded-xl p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {lead.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{lead.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{lead.company || lead.city || '—'}</p>
          </div>
        </div>
        <GripVertical className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 mt-0.5 transition-colors" />
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <span className="text-base font-bold">{value > 0 ? fmt(value) : '—'}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${intentBadgeClass(lead.buying_intent)}`}>
          {intentEmoji(lead.buying_intent)} {lead.buying_intent}
        </span>
      </div>

      {/* Win probability bar */}
      <div className="mb-2.5">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Win probability</span>
          <span className="font-medium">{winProb}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${winProb >= 70 ? 'bg-emerald-500' : winProb >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
            style={{ width: `${winProb}%` }}
          />
        </div>
      </div>

      {lead.ai_summary && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1.5 mb-2">
          <ArrowRight className="size-3 text-primary shrink-0" />
          <span className="truncate">{lead.ai_summary}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>{days !== null ? `${days}d ago` : 'Never'}</span>
        </div>
        {lead.source && (
          <span className="text-xs text-muted-foreground">{lead.source}</span>
        )}
      </div>
    </div>
  )
}

// ── Stage Column ──────────────────────────────────────────────────────────────
function StageColumn({
  stage, leads, onDragStart, onDrop, onDragOver, onAddDeal,
}: {
  stage: Stage
  leads: Lead[]
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, stageId: StageId) => void
  onDragOver: (e: React.DragEvent) => void
  onAddDeal: (stageId: StageId) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const total = leads.reduce((s, d) => s + (d.deal_value || d.estimated_budget || 0), 0)

  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b-2 ${stage.bgColor} ${stage.borderColor}`}>
        <div className="flex items-center gap-2">
          <span className={stage.textColor}>{stage.icon}</span>
          <span className={`text-sm font-semibold ${stage.textColor}`}>{stage.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/70 font-medium ${stage.textColor}`}>{leads.length}</span>
        </div>
        {total > 0 && <span className={`text-xs font-bold ${stage.textColor}`}>{fmt(total)}</span>}
      </div>

      <div
        className={`flex-1 min-h-[400px] p-2 space-y-2.5 rounded-b-xl border border-t-0 transition-colors ${stage.borderColor} ${isDragOver ? `${stage.bgColor} ring-2 ring-offset-0` : 'bg-muted/20'}`}
        onDrop={e => { setIsDragOver(false); onDrop(e, stage.id) }}
        onDragOver={e => { onDragOver(e); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
      >
        {leads.map(lead => (
          <DealCard key={lead.id} lead={lead} onDragStart={onDragStart} />
        ))}
        <button
          onClick={() => onAddDeal(stage.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 rounded-lg transition-colors"
        >
          <Plus className="size-3.5" /> Add lead
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { leads, isLoading, refetch, updateLeadStatus } = useRealtimeLeads()
  const [dragging, setDragging] = useState<string | null>(null)
  const [addModal, setAddModal] = useState<StageId | null>(null)
  const [form, setForm] = useState({ full_name: '', company: '', phone_number: '', deal_value: '' })
  const [saving, setSaving] = useState(false)

  const activeLeads = leads.filter(l => !['closed_won', 'closed_lost'].includes(l.status))
  const totalPipeline = activeLeads.reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)
  const wonValue = leads.filter(l => l.status === 'closed_won').reduce((s, l) => s + (l.deal_value || 0), 0)
  const weightedValue = activeLeads.reduce((s, l) => {
    const prob = l.buying_intent === 'high' ? 0.8 : l.buying_intent === 'medium' ? 0.5 : 0.25
    return s + (l.deal_value || l.estimated_budget || 0) * prob
  }, 0)

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(e: React.DragEvent, targetStage: StageId) {
    e.preventDefault()
    if (!dragging) return
    await updateLeadStatus(dragging, targetStage)
    setDragging(null)
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault() }

  const handleAddLead = useCallback(async () => {
    if (!addModal || !form.full_name) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('leads').insert({
      user_id: user.id,
      full_name: form.full_name,
      company: form.company || null,
      phone_number: form.phone_number || null,
      deal_value: form.deal_value ? Number(form.deal_value) : null,
      status: addModal,
      buying_intent: 'medium',
      sentiment_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setAddModal(null)
    setForm({ full_name: '', company: '', phone_number: '', deal_value: '' })
    setSaving(false)
    refetch()
  }, [addModal, form, refetch])

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="Sales Pipeline" subtitle="Loading live deals from Supabase…" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Sales Pipeline"
        subtitle={`${activeLeads.length} active leads · Weighted: ${fmt(weightedValue)} · Live from Supabase`}
      />

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-hidden">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Pipeline', value: fmt(totalPipeline), icon: <TrendingUp className="size-4" />, color: 'text-primary' },
            { label: 'Weighted Value',  value: fmt(weightedValue),  icon: <Target className="size-4" />,    color: 'text-violet-600' },
            { label: 'Won This Month',  value: fmt(wonValue),       icon: <Trophy className="size-4" />,    color: 'text-emerald-600' },
            { label: 'Active Deals',    value: String(activeLeads.length), icon: <IndianRupee className="size-4" />, color: 'text-amber-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className={`flex items-center gap-2 mb-1 ${s.color}`}>
                  {s.icon}
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
            <span className="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Real-time · Drag to update status in Supabase
          </Badge>
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw className="size-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Kanban board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={leads.filter(l => l.status === stage.id)}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onAddDeal={id => setAddModal(id)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Add Lead Modal */}
      <Dialog open={!!addModal} onOpenChange={() => setAddModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              Add Lead to {STAGES.find(s => s.id === addModal)?.label}
            </DialogTitle>
            <DialogDescription>This will create a new lead record in Supabase.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-name">Full Name *</Label>
              <Input id="lead-name" placeholder="e.g. Rajesh Mehta" value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-company">Company</Label>
              <Input id="lead-company" placeholder="e.g. TechCorp India" value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input id="lead-phone" placeholder="+91 98765 43210" value={form.phone_number}
                  onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-value">Deal Value (₹)</Label>
                <Input id="lead-value" type="number" placeholder="500000" value={form.deal_value}
                  onChange={e => setForm(p => ({ ...p, deal_value: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(null)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={!form.full_name || saving}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-1" />}
              {saving ? 'Saving…' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
