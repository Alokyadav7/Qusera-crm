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
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="size-5 text-emerald-600" />
                Live Revenue Command Center
                <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-200 bg-emerald-50">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime
                </Badge>
              </CardTitle>
              <CardDescription>
                Pipeline health, urgent work, verification risk, and next best deals update as your team works.
              </CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href="/dashboard/pipeline">
                Open Pipeline
                <ArrowUpRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <IndianRupee className="mb-3 size-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Open Pipeline</p>
              <p className="text-2xl font-bold">{money(pipelineValue)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <Gauge className="mb-3 size-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Close Score</p>
              <p className="text-2xl font-bold">{liveCloseScore}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <Timer className="mb-3 size-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Today / Overdue</p>
              <p className="text-2xl font-bold">{todaysTasks.length}/{overdueTasks.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <ShieldCheck className="mb-3 size-4 text-cyan-600" />
              <p className="text-xs text-muted-foreground">Verified Leads</p>
              <p className="text-2xl font-bold">{verificationRate}%</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Board Readiness</p>
                  <p className="text-xs text-muted-foreground">Won: {money(wonValue)} · Hot deals: {hotLeads.length}</p>
                </div>
                {leadsLoading && <Badge variant="secondary">Syncing</Badge>}
              </div>
              <Progress value={liveCloseScore} className="h-2" />
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <p className="font-semibold">{activeLeads.length}</p>
                  <p className="text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="font-semibold">{interactions.length}</p>
                  <p className="text-muted-foreground">Touches</p>
                </div>
                <div>
                  <p className="font-semibold">{tasks.filter(task => !task.is_completed).length}</p>
                  <p className="text-muted-foreground">Open Tasks</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Bot className="size-4 text-primary" />
                Next Best Actions
              </p>
              <div className="space-y-3">
                {nextBestLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add leads to generate a live action queue.</p>
                ) : (
                  nextBestLeads.map(lead => (
                    <div key={lead.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.company || lead.city || 'No company'} · {lead.buying_intent} intent · {money(lead.deal_value || lead.estimated_budget || 0)}
                        </p>
                      </div>
                      <Badge variant="outline">{scoreLead(lead)}%</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-5 text-amber-600" />
            Revenue Risk Radar
          </CardTitle>
          <CardDescription>What needs attention before it leaks revenue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overdueTasks.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
              <p className="text-sm font-semibold">{overdueTasks.length} overdue task{overdueTasks.length === 1 ? '' : 's'}</p>
              <p className="text-xs">Clear these first to protect follow-up speed and win rate.</p>
            </div>
          )}
          {verificationRate < 60 && leads.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-sm font-semibold">Verification below target</p>
              <p className="text-xs">Push GST/PAN checks above 60% for cleaner deal qualification.</p>
            </div>
          )}
          {lastInteraction ? (
            <div className="rounded-lg border p-3">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4 text-primary" />
                Latest Customer Signal
              </p>
              <p className="text-sm">{lastInteraction.lead?.full_name || 'Unknown lead'}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {lastInteraction.content_transcribed || lastInteraction.content_raw || 'No message content captured'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              No customer interactions yet. Voice, WhatsApp, calls, and email activity will appear here live.
            </div>
          )}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard/scoring">Review AI Lead Scoring</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
