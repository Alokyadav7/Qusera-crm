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
import { toast } from 'sonner'

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
  { id: 'new', label: 'New', textColor: 'text-slate-700 dark:text-slate-355', bgColor: 'bg-slate-50/80 dark:bg-slate-900/30', borderColor: 'border-slate-200 dark:border-slate-800/80', icon: <Target className="size-3.5" /> },
  { id: 'contacted', label: 'Contacted', textColor: 'text-blue-755 dark:text-blue-300', bgColor: 'bg-blue-50/70 dark:bg-blue-950/20', borderColor: 'border-blue-200 dark:border-blue-900/60', icon: <Phone className="size-3.5" /> },
  { id: 'interested', label: 'Interested', textColor: 'text-violet-755 dark:text-violet-300', bgColor: 'bg-violet-50/70 dark:bg-violet-950/20', borderColor: 'border-violet-200 dark:border-violet-900/60', icon: <Star className="size-3.5" /> },
  { id: 'verified', label: 'Verified', textColor: 'text-cyan-755 dark:text-cyan-300', bgColor: 'bg-cyan-50/70 dark:bg-cyan-950/20', borderColor: 'border-cyan-200 dark:border-cyan-900/60', icon: <Sparkles className="size-3.5" /> },
  { id: 'negotiation', label: 'Negotiation', textColor: 'text-amber-755 dark:text-amber-300', bgColor: 'bg-amber-50/70 dark:bg-amber-950/20', borderColor: 'border-amber-200 dark:border-amber-900/60', icon: <TrendingUp className="size-3.5" /> },
  { id: 'closed_won', label: 'Won ✓', textColor: 'text-emerald-755 dark:text-emerald-300', bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/20', borderColor: 'border-emerald-200 dark:border-emerald-900/60', icon: <Trophy className="size-3.5" /> },
  { id: 'closed_lost', label: 'Lost', textColor: 'text-red-755 dark:text-red-300', bgColor: 'bg-red-50/70 dark:bg-red-950/20', borderColor: 'border-red-200 dark:border-red-900/60', icon: <AlertCircle className="size-3.5" /> },
]

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function intentBadgeClass(intent: Lead['buying_intent']) {
  return intent === 'high' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-955/30' :
    intent === 'medium' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-955/30' :
      'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800'
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
      className="group bg-white dark:bg-zinc-900/90 border border-border/80 dark:border-border/40 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 dark:hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {lead.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight text-foreground">{lead.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{lead.company || lead.city || '—'}</p>
          </div>
        </div>
        <GripVertical className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 mt-0.5 transition-colors" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-bold text-foreground">{value > 0 ? fmt(value) : '—'}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${intentBadgeClass(lead.buying_intent)}`}>
          {intentEmoji(lead.buying_intent)} {lead.buying_intent.toUpperCase()}
        </span>
      </div>

      {/* Win probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>Win probability</span>
          <span className="font-semibold">{winProb}%</span>
        </div>
        <div className="h-1.5 bg-muted dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${winProb >= 70 ? 'bg-emerald-500' : winProb >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
            style={{ width: `${winProb}%` }}
          />
        </div>
      </div>

      {lead.ai_summary && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/5 rounded-xl p-2 mb-2">
          <Sparkles className="size-3 text-primary shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-tight">{lead.ai_summary}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-border/50">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          <span>{days !== null ? `${days}d ago` : 'Never'}</span>
        </div>
        {lead.source && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/75">{lead.source}</span>
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
    <div className="flex flex-col min-w-[290px] w-[290px] md:min-w-[310px] md:w-[310px]">
      <div className={`flex items-center justify-between px-3.5 py-3 rounded-t-2xl border border-b-2 ${stage.bgColor} ${stage.borderColor}`}>
        <div className="flex items-center gap-2">
          <span className={stage.textColor}>{stage.icon}</span>
          <span className={`text-sm font-bold tracking-tight ${stage.textColor}`}>{stage.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-black/40 font-bold border border-border/10 ${stage.textColor}`}>{leads.length}</span>
        </div>
        {total > 0 && <span className={`text-xs font-bold ${stage.textColor}`}>{fmt(total)}</span>}
      </div>

      <div
        className={`flex-1 min-h-[500px] p-3 space-y-3 rounded-b-2xl border border-t-0 transition-all duration-300 ${stage.borderColor} ${isDragOver ? `${stage.bgColor} ring-2 ring-primary/20 dark:ring-primary/10 ring-offset-0` : 'bg-muted/10 dark:bg-black/10'}`}
        onDrop={e => { setIsDragOver(false); onDrop(e, stage.id) }}
        onDragOver={e => { onDragOver(e); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
      >
        {leads.map(lead => (
          <DealCard key={lead.id} lead={lead} onDragStart={onDragStart} />
        ))}
        <button
          onClick={() => onAddDeal(stage.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 dark:hover:border-primary/40 rounded-xl transition-all bg-background/40 hover:bg-background/80"
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
  const wonValue = leads.filter(l => l.status === 'closed_won').reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)
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

    const { data: inserted, error } = await supabase.from('leads').insert({
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
    }).select().single()

    if (error) {
      toast.error('Failed to add lead: ' + error.message)
    } else if (inserted) {
      // Instantly add the new card to the kanban without waiting for refetch
      refetch()
      toast.success(`Lead "${form.full_name}" added successfully`)
    }

    setAddModal(null)
    setForm({ full_name: '', company: '', phone_number: '', deal_value: '' })
    setSaving(false)
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
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-hidden">
      <CRMHeader
        title="Sales Pipeline"
        subtitle={`${activeLeads.length} active leads · Weighted: ${fmt(weightedValue)} · Live from Supabase`}
      />

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-hidden w-full max-w-full flex flex-col min-h-0">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {[
            { label: 'Total Pipeline', value: fmt(totalPipeline), icon: <TrendingUp className="size-4 text-primary" />, bg: 'from-primary/5 to-transparent border-primary/20 dark:border-primary/10' },
            { label: 'Weighted Value', value: fmt(weightedValue), icon: <Target className="size-4 text-violet-500" />, bg: 'from-violet-500/5 to-transparent border-violet-500/20 dark:border-violet-500/10' },
            { label: 'Won This Month', value: fmt(wonValue), icon: <Trophy className="size-4 text-emerald-500" />, bg: 'from-emerald-500/5 to-transparent border-emerald-500/20 dark:border-emerald-500/10' },
            { label: 'Active Deals', value: String(activeLeads.length), icon: <IndianRupee className="size-4 text-amber-500" />, bg: 'from-amber-500/5 to-transparent border-amber-500/20 dark:border-amber-500/10' },
          ].map(s => (
            <Card key={s.label} className={`bg-gradient-to-br ${s.bg} border shadow-sm transition-all hover:shadow-md`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
                  <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{s.value}</p>
                </div>
                <div className="size-10 rounded-xl bg-background border flex items-center justify-center shadow-inner shrink-0">
                  {s.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between shrink-0">
          <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/20 dark:border-emerald-500/10 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Real-time · Drag to update status in Supabase
          </Badge>
          <Button size="sm" variant="outline" onClick={refetch} className="shadow-sm rounded-xl">
            <RefreshCw className="size-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 min-w-0 w-full">
          <div className="flex gap-4 min-w-max h-full">
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
