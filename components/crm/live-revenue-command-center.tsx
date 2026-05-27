'use client'

import Link from 'next/link'
import { isPast, isToday } from 'date-fns'
import {
  AlertTriangle,
  ArrowUpRight,
  Gauge,
  IndianRupee,
  MessageSquare,
  Radio,
  ShieldCheck,
  Bot,
  Timer,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useRealtimeLeads, type Lead } from '@/hooks/use-realtime-leads'
import { useRealtimeTasks, type RealtimeTask } from '@/hooks/use-realtime-tasks'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'

interface LiveRevenueCommandCenterProps {
  initialLeads: Lead[]
  initialTasks: RealtimeTask[]
}

function money(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
  return `₹${value}`
}

function scoreLead(lead: Lead) {
  const intent = lead.buying_intent === 'high' ? 35 : lead.buying_intent === 'medium' ? 20 : 8
  const sentiment = Math.max(0, Math.round((lead.sentiment_score + 1) * 15))
  const value = Math.min(25, Math.round(((lead.deal_value || lead.estimated_budget || 0) / 1000000) * 25))
  const verified = lead.gst_status === 'verified' || lead.pan_status === 'verified' ? 10 : 0
  return Math.min(100, intent + sentiment + value + verified)
}

function getPipelineValue(leads: Lead[]) {
  return leads
    .filter(lead => !['closed_won', 'closed_lost'].includes(lead.status))
    .reduce((sum, lead) => sum + (lead.deal_value || lead.estimated_budget || 0), 0)
}

export function LiveRevenueCommandCenter({ initialLeads, initialTasks }: LiveRevenueCommandCenterProps) {
  const { leads, isLoading: leadsLoading } = useRealtimeLeads(initialLeads)
  const { tasks } = useRealtimeTasks(initialTasks)
  const { interactions } = useRealtimeInteractions()

  const activeLeads = leads.filter(lead => !['closed_won', 'closed_lost'].includes(lead.status))
  const hotLeads = activeLeads.filter(lead => lead.buying_intent === 'high')
  const overdueTasks = tasks.filter(task => !task.is_completed && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)))
  const todaysTasks = tasks.filter(task => !task.is_completed && isToday(new Date(task.due_date)))
  const verifiedLeads = leads.filter(lead => lead.gst_status === 'verified' || lead.pan_status === 'verified').length
  const verificationRate = leads.length ? Math.round((verifiedLeads / leads.length) * 100) : 0
  const pipelineValue = getPipelineValue(leads)
  const wonValue = leads
    .filter(lead => lead.status === 'closed_won')
    .reduce((sum, lead) => sum + (lead.deal_value || lead.estimated_budget || 0), 0)
  const liveCloseScore = activeLeads.length
    ? Math.round(activeLeads.reduce((sum, lead) => sum + scoreLead(lead), 0) / activeLeads.length)
    : 0

  const nextBestLeads = [...activeLeads]
    .sort((a, b) => scoreLead(b) - scoreLead(a))
    .slice(0, 3)

  const lastInteraction = interactions[0]

  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-border/80 bg-card rounded-lg shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Radio className="size-4 text-foreground" />
                Live Revenue Command Center
                <Badge variant="outline" className="gap-1 text-foreground border-border/80 bg-muted/30 text-[10px] font-mono font-bold">
                  <span className="size-1.5 rounded-full bg-foreground" />
                  Realtime
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Pipeline health, urgent work, verification risk, and next best deals update as your team works.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild className="h-8 text-xs font-semibold">
              <Link href="/dashboard/pipeline">
                Open Pipeline
                <ArrowUpRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
              <IndianRupee className="mb-2 size-4 text-muted-foreground" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Open Pipeline</p>
              <p className="text-xl font-extrabold text-foreground">{money(pipelineValue)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
              <Gauge className="mb-2 size-4 text-muted-foreground" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Close Score</p>
              <p className="text-xl font-extrabold text-foreground">{liveCloseScore}%</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
              <Timer className="mb-2 size-4 text-muted-foreground" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Today / Overdue</p>
              <p className="text-xl font-extrabold text-foreground">{todaysTasks.length}/{overdueTasks.length}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
              <ShieldCheck className="mb-2 size-4 text-muted-foreground" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Verified Leads</p>
              <p className="text-xl font-extrabold text-foreground">{verificationRate}%</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-border/60 p-4 bg-muted/5 flex flex-col justify-between">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Board Readiness</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Won: {money(wonValue)} · Hot deals: {hotLeads.length}</p>
                </div>
                {leadsLoading && <Badge variant="secondary" className="text-[9px]">Syncing</Badge>}
              </div>
              
              <div className="space-y-3">
                <Progress value={liveCloseScore} className="h-1.5 bg-muted [&>div]:bg-foreground" />
                
                <div className="flex items-center justify-between text-center pt-2 border-t border-border/40">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-foreground leading-tight">{activeLeads.length}</span>
                    <span className="text-[8px] font-bold tracking-wider text-muted-foreground uppercase mt-0.5">Active</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-foreground leading-tight">{interactions.length}</span>
                    <span className="text-[8px] font-bold tracking-wider text-muted-foreground uppercase mt-0.5">Touches</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-foreground leading-tight">{tasks.filter(task => !task.is_completed).length}</span>
                    <span className="text-[8px] font-bold tracking-wider text-muted-foreground uppercase mt-0.5">Open Tasks</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-4 bg-muted/5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Bot className="size-4 text-muted-foreground" />
                Next Best Actions
              </p>
              <div className="space-y-2">
                {nextBestLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add leads to generate a live action queue.</p>
                ) : (
                  nextBestLeads.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{lead.full_name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {lead.company || 'No company'} · {lead.buying_intent} intent
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono">{scoreLead(lead)}%</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card rounded-lg shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <AlertTriangle className="size-4 text-muted-foreground" />
            Revenue Risk Radar
          </CardTitle>
          <CardDescription className="text-xs">What needs attention before it leaks revenue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overdueTasks.length > 0 && (
            <div className="rounded-lg border border-border p-3 text-foreground bg-muted/10">
              <p className="text-xs font-bold">{overdueTasks.length} overdue task{overdueTasks.length === 1 ? '' : 's'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Clear these first to protect follow-up speed and win rate.</p>
            </div>
          )}
          {verificationRate < 60 && leads.length > 0 && (
            <div className="rounded-lg border border-border p-3 text-foreground bg-muted/10">
              <p className="text-xs font-bold">Verification below target</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Push GST/PAN checks above 60% for cleaner deal qualification.</p>
            </div>
          )}
          {lastInteraction ? (
            <div className="rounded-lg border border-border/60 p-3 bg-muted/5">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <MessageSquare className="size-3.5 text-muted-foreground" />
                Latest Customer Signal
              </p>
              <p className="text-xs font-semibold text-foreground">{lastInteraction.lead?.full_name || 'Unknown lead'}</p>
              <p className="line-clamp-2 text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {lastInteraction.content_transcribed || lastInteraction.content_raw || 'No message content captured'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground bg-muted/5">
              No customer interactions yet. Voice, WhatsApp, calls, and email activity will appear here live.
            </div>
          )}
          <Button variant="outline" className="w-full h-8 text-xs font-semibold" asChild>
            <Link href="/dashboard/scoring">Review AI Lead Scoring</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
