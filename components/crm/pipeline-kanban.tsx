'use client'

import { useState } from 'react'
import { Bot, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Lead } from '@/hooks/use-realtime-leads'

// ── Stage config ──────────────────────────────────────────────────────────────
type KanbanStage = 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won'

const STAGE_CONFIG: Record<KanbanStage, { label: string; color: string; bg: string; border: string }> = {
  prospect: { label: 'Prospect', color: 'text-muted-foreground', bg: 'bg-foreground/5', border: 'border-foreground/20' },
  qualified: { label: 'Qualified', color: 'text-foreground/70', bg: 'bg-foreground/5', border: 'border-foreground/40' },
  proposal: { label: 'Proposal', color: 'text-foreground/80', bg: 'bg-foreground/5', border: 'border-foreground/60' },
  negotiation: { label: 'Negotiation', color: 'text-foreground/90', bg: 'bg-foreground/10', border: 'border-foreground/80' },
  closed_won: { label: 'Closed Won', color: 'text-foreground font-bold', bg: 'bg-foreground/10', border: 'border-foreground' },
}

function leadStatusToStage(status: Lead['status']): KanbanStage {
  switch (status) {
    case 'new': return 'prospect'
    case 'contacted':
    case 'interested': return 'qualified'
    case 'verified': return 'proposal'
    case 'negotiation': return 'negotiation'
    case 'closed_won': return 'closed_won'
    default: return 'prospect'
  }
}

function stageToLeadStatus(stage: KanbanStage): Lead['status'] {
  switch (stage) {
    case 'prospect': return 'new'
    case 'qualified': return 'interested'
    case 'proposal': return 'verified'
    case 'negotiation': return 'negotiation'
    case 'closed_won': return 'closed_won'
  }
}

function formatValue(v: number | null | undefined) {
  if (!v) return '—'
  return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`
}
function getAvatarColor(name: string) {
  const colors = ['bg-zinc-800', 'bg-zinc-700', 'bg-zinc-900', 'bg-neutral-800', 'bg-stone-800']
  return colors[name.charCodeAt(0) % colors.length]
}
function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

// ── Deal Card with drag support ───────────────────────────────────────────────
interface DealCardProps {
  lead: Lead
  onAIClick: (lead: Lead) => void
  onDragStart: (lead: Lead) => void
  onMoveNext: (lead: Lead) => void
  stages: KanbanStage[]
}

function DealCard({ lead, onAIClick, onDragStart, onMoveNext, stages }: DealCardProps) {
  const stage = leadStatusToStage(lead.status)
  const daysInStage = daysAgo(lead.updated_at)
  const isStale = daysInStage > 10
  const prob = lead.buying_intent === 'high' ? 75 : lead.buying_intent === 'medium' ? 45 : 20
  const probColor = prob >= 70 ? 'bg-foreground' : prob >= 40 ? 'bg-foreground/60' : 'bg-foreground/30'
  const isLastStage = stage === 'closed_won'
  const nextStageIdx = stages.indexOf(stage) + 1
  const nextStage = !isLastStage ? stages[nextStageIdx] : null

  return (
    <div
      className="glass-card rounded-xl p-3 card-hover cursor-grab active:cursor-grabbing group relative overflow-hidden bg-background border border-border/50 shadow-sm"
      draggable
      onDragStart={() => onDragStart(lead)}
      onClick={() => onAIClick(lead)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm leading-tight text-foreground truncate">{lead.full_name}</p>
        {isStale && <AlertCircle className="size-3.5 text-foreground/50 shrink-0 mt-0.5" aria-label="Stale deal" />}
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <div className={`size-5 rounded-full ${getAvatarColor(lead.full_name)} flex items-center justify-center shrink-0`}>
          <span className="text-[9px] text-white font-bold">{lead.full_name[0]}</span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{lead.company || lead.city || 'Unknown'}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-foreground">
          {formatValue(lead.deal_value || lead.estimated_budget)}
        </span>
        <span className="text-xs text-muted-foreground">{prob}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden mb-2">
        <div className={`h-full rounded-full ${probColor} transition-all`} style={{ width: `${prob}%` }} />
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{daysInStage}d in stage</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="flex items-center gap-1 text-[10px] text-foreground hover:underline font-medium"
            onClick={e => { e.stopPropagation(); onAIClick(lead) }}
          >
            <Bot className="size-2.5" /> AI
          </button>
          {nextStage && (
            <button
              className="flex items-center gap-0.5 text-[10px] text-foreground/70 hover:text-foreground hover:underline ml-1"
              onClick={e => { e.stopPropagation(); onMoveNext(lead) }}
              title={`Move to ${STAGE_CONFIG[nextStage].label}`}
            >
              <ChevronRight className="size-3" />{STAGE_CONFIG[nextStage].label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
interface PipelineKanbanProps {
  leads: Lead[]
  isLoading: boolean
  onUpdateLeadStatus: (id: string, status: Lead['status']) => Promise<void>
  onAIAction?: (prompt: string, context: string) => void
}

export function PipelineKanban({ leads, isLoading, onUpdateLeadStatus, onAIAction }: PipelineKanbanProps) {
  const [dragging, setDragging] = useState<Lead | null>(null)
  const [dragOverStage, setDragOverStage] = useState<KanbanStage | null>(null)

  const activeLeads = leads.filter(l => l.status !== 'closed_lost')
  const stages = Object.keys(STAGE_CONFIG) as KanbanStage[]

  const leadsByStage = stages.reduce<Record<KanbanStage, Lead[]>>((acc, stage) => {
    acc[stage] = activeLeads.filter(l => leadStatusToStage(l.status) === stage)
    return acc
  }, {} as Record<KanbanStage, Lead[]>)

  function handleAIClick(lead: Lead) {
    const stage = leadStatusToStage(lead.status)
    const value = formatValue(lead.deal_value || lead.estimated_budget)
    const ctx = `Deal: ${lead.full_name} | Company: ${lead.company || 'N/A'} | Value: ${value} | Stage: ${STAGE_CONFIG[stage].label} | Intent: ${lead.buying_intent} | Days in stage: ${daysAgo(lead.updated_at)}`
    const prompt = `Analyze deal for "${lead.full_name}" at ${lead.company || 'their company'} (${value}). It's been in ${STAGE_CONFIG[stage].label} for ${daysAgo(lead.updated_at)} days with ${lead.buying_intent} buying intent. What are the top 3 specific actions to ${stage === 'closed_won' ? 'retain and upsell this customer' : 'move this deal forward and close it'}?`
    onAIAction?.(prompt, ctx)
  }

  function handleMoveNext(lead: Lead) {
    const stage = leadStatusToStage(lead.status)
    const idx = stages.indexOf(stage)
    if (idx < stages.length - 1) {
      onUpdateLeadStatus(lead.id, stageToLeadStatus(stages[idx + 1]))
    }
  }

  // ── Drag events ──
  function handleDragOver(e: React.DragEvent, stage: KanbanStage) {
    e.preventDefault()
    setDragOverStage(stage)
  }

  function handleDrop(e: React.DragEvent, stage: KanbanStage) {
    e.preventDefault()
    if (dragging && leadStatusToStage(dragging.status) !== stage) {
      onUpdateLeadStatus(dragging.id, stageToLeadStatus(stage))
    }
    setDragging(null)
    setDragOverStage(null)
  }

  const pipelineValue = activeLeads
    .filter(l => l.status !== 'closed_won')
    .reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)
  const wonValue = activeLeads
    .filter(l => l.status === 'closed_won')
    .reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Pipeline Kanban
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {activeLeads.length} live
              </span>
            </CardTitle>
            <CardDescription>
              Real-time · Drag cards between stages · Click for AI advice · Hover for quick-move button
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Pipeline</p>
              <p className="font-bold text-foreground">{formatValue(pipelineValue)}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Won</p>
              <p className="font-bold text-foreground">{formatValue(wonValue)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading pipeline…
          </div>
        ) : (
          <div className="w-full overflow-x-auto px-6 pb-6 sm:px-0 sm:pb-0">
            <div
              className="grid gap-4 min-w-[900px] w-full"
              style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(180px, 1fr))` }}
            >
              {stages.map(stage => {
                const cfg = STAGE_CONFIG[stage]
                const stageLeads = leadsByStage[stage]
                const stageValue = stageLeads.reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)
                const isOver = dragOverStage === stage

                return (
                  <div
                    key={stage}
                    className={`rounded-xl p-3 border transition-all flex flex-col min-h-[350px] ${cfg.bg} ${isOver ? `${cfg.border} scale-[1.01] shadow-md` : 'border-transparent'
                      }`}
                    onDragOver={e => handleDragOver(e, stage)}
                    onDragLeave={() => setDragOverStage(null)}
                    onDrop={e => handleDrop(e, stage)}
                  >
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-[10px] text-muted-foreground">{stageLeads.length} deal{stageLeads.length !== 1 ? 's' : ''}</p>
                      </div>
                      {stageValue > 0 && (
                        <Badge variant="outline" className="text-[10px] font-medium shrink-0 ml-1">{formatValue(stageValue)}</Badge>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      {stageLeads.map(lead => (
                        <DealCard
                          key={lead.id}
                          lead={lead}
                          stages={stages}
                          onAIClick={handleAIClick}
                          onDragStart={setDragging}
                          onMoveNext={handleMoveNext}
                        />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className={`h-full min-h-[120px] flex items-center justify-center text-center text-xs text-muted-foreground border border-dashed rounded-lg transition-all ${isOver ? 'border-foreground bg-foreground/5 text-foreground' : 'border-border/50'
                          }`}>
                          {isOver ? '⬇ Drop here' : 'No deals here'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}