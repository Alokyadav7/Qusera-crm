'use client'

import Link from 'next/link'
import { formatDistanceToNow, isPast } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  HeartHandshake,
  MessageSquareWarning,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useRealtimeLeads, type Lead } from '@/hooks/use-realtime-leads'
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'

function money(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
  return `₹${value}`
}

function daysSince(date?: string | null) {
  if (!date) return 999
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function customerHealth(lead: Lead) {
  const contactPenalty = Math.min(35, daysSince(lead.last_contacted_at || lead.updated_at) * 2)
  const sentiment = Math.round(((lead.sentiment_score || 0) + 1) * 20)
  const verification = lead.gst_status === 'verified' || lead.pan_status === 'verified' ? 15 : 0
  const valueSignal = (lead.deal_value || lead.estimated_budget || 0) > 0 ? 10 : 0
  return Math.max(0, Math.min(100, 50 + sentiment + verification + valueSignal - contactPenalty))
}

function healthTone(score: number) {
  if (score >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default function CustomerSuccessPage() {
  const { leads, isLoading: leadsLoading, refetch: refetchLeads } = useRealtimeLeads()
  const { tasks, refetch: refetchTasks } = useRealtimeTasks()
  const { interactions, refetch: refetchInteractions } = useRealtimeInteractions()

  const customers = leads
    .filter(lead => lead.status === 'closed_won')
    .map(lead => ({ lead, health: customerHealth(lead) }))
    .sort((a, b) => a.health - b.health)

  const atRisk = customers.filter(customer => customer.health < 50)
  const expansionReady = customers.filter(customer => customer.health >= 75)
  const openCustomerTasks = tasks.filter(task => {
    if (task.is_completed) return false
    return customers.some(customer => customer.lead.id === task.lead?.full_name || customer.lead.full_name === task.lead?.full_name)
  })
  const negativeSignals = interactions
    .filter(item => item.sentiment_score !== null && item.sentiment_score < -0.3)
    .slice(0, 5)
  const totalCustomerValue = customers.reduce((sum, customer) => sum + (customer.lead.deal_value || customer.lead.estimated_budget || 0), 0)
  const avgHealth = customers.length
    ? Math.round(customers.reduce((sum, customer) => sum + customer.health, 0) / customers.length)
    : 0

  const refreshAll = () => {
    refetchLeads()
    refetchTasks()
    refetchInteractions()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <CRMHeader
        title="Customer Success"
        subtitle="Realtime customer health, renewal risk, support signals, and expansion opportunities."
      />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Post-sale Command Center</h2>
            <p className="text-sm text-muted-foreground">
              Built from won deals, customer touches, pending tasks, sentiment, and verification quality.
            </p>
          </div>
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <HeartHandshake className="mb-3 size-5 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Activity className="mb-3 size-5 text-blue-600" />
              <p className="text-xs text-muted-foreground">Avg Health</p>
              <p className="text-2xl font-bold">{avgHealth}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <AlertTriangle className="mb-3 size-5 text-red-600" />
              <p className="text-xs text-muted-foreground">At Risk</p>
              <p className="text-2xl font-bold">{atRisk.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <TrendingUp className="mb-3 size-5 text-amber-600" />
              <p className="text-xs text-muted-foreground">Customer Value</p>
              <p className="text-2xl font-bold">{money(totalCustomerValue)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-5 text-emerald-600" />
                Customer Health
                <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-200 bg-emerald-50">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </Badge>
              </CardTitle>
              <CardDescription>Low scores mean no recent touch, weak sentiment, or incomplete verification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {leadsLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Loading customers...</div>
              ) : customers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <HeartHandshake className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                  <p className="font-medium">No closed-won customers yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Move deals to Closed Won to start tracking health and renewals.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/pipeline">Open Pipeline</Link>
                  </Button>
                </div>
              ) : (
                customers.map(({ lead, health }) => (
                  <div key={lead.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold">{lead.full_name}</p>
                        <p className="text-sm text-muted-foreground">{lead.company || lead.city || 'Customer account'}</p>
                      </div>
                      <Badge variant="outline" className={healthTone(health)}>
                        {health >= 75 ? 'Healthy' : health >= 50 ? 'Watch' : 'At Risk'} · {health}%
                      </Badge>
                    </div>
                    <Progress value={health} className="mt-4 h-2" />
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>Value: {money(lead.deal_value || lead.estimated_budget || 0)}</span>
                      <span>Last touch: {lead.last_contacted_at ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true }) : 'No touch logged'}</span>
                      <span>Verification: {lead.gst_status === 'verified' || lead.pan_status === 'verified' ? 'Verified' : 'Pending'}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-5 text-amber-500" />
                  Expansion Queue
                </CardTitle>
                <CardDescription>Healthy customers ready for renewal or upsell.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {expansionReady.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expansion-ready customers yet.</p>
                ) : (
                  expansionReady.slice(0, 5).map(({ lead, health }) => (
                    <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{lead.company || 'Customer'} · {health}% health</p>
                      </div>
                      <Button size="icon" variant="ghost" asChild>
                        <Link href="/dashboard/leads">
                          <ArrowUpRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquareWarning className="size-5 text-red-500" />
                  Support Signals
                </CardTitle>
                <CardDescription>Negative sentiment and pending customer work.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {negativeSignals.length === 0 && openCustomerTasks.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    No urgent support signal detected.
                  </div>
                ) : (
                  <>
                    {negativeSignals.map(signal => (
                      <div key={signal.id} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                        <p className="font-medium">{signal.lead?.full_name || 'Unknown lead'}</p>
                        <p className="line-clamp-2 text-xs">{signal.content_transcribed || signal.content_raw || 'Negative interaction logged'}</p>
                      </div>
                    ))}
                    {openCustomerTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {isPast(new Date(task.due_date)) ? 'Overdue' : 'Open'} · {task.lead?.full_name || 'Customer task'}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
