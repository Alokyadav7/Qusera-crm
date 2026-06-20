'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, BarChart3, Activity, BrainCircuit, CheckSquare, MessageSquare, TrendingUp, Clock, AlertCircle, RefreshCw, ArrowRight, Phone, Target, Zap } from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  id: string
  title: string
  priority: string
  is_completed: boolean
  due_date: string | null
  lead_name?: string | null
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, href }: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/20 transition-colors cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
            <div className="size-9 rounded-lg border border-border flex items-center justify-center shrink-0">
              <Icon className="size-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── AI Insight Card ───────────────────────────────────────────────────────────
function InsightCard({ title, body, action, href }: {
  title: string
  body: string
  action: string
  href: string
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors group">
      <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <BrainCircuit className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{body}</p>
      </div>
      <Link href={href}>
        <Button variant="ghost" size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {action} <ArrowRight className="size-3 ml-1" />
        </Button>
      </Link>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function KlinqPage() {
  const { leads, isLoading: leadsLoading, refetch } = useRealtimeLeads()
  const { interactions, isLoading: interactionsLoading } = useRealtimeInteractions()
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const supabase = createClient()
    // Fetch tasks without lead join to avoid PostgREST array/object ambiguity
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, priority, is_completed, due_date, lead_id')
      .eq('is_completed', false)
      .order('due_date', { ascending: true })
      .limit(10)
    if (!error && data) setTasks(data as Task[])
    setTasksLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const isLoading = leadsLoading || interactionsLoading

  // ── Derived metrics ──
  const stats = useMemo(() => {
    const active = leads.filter(l => !['closed_won', 'closed_lost'].includes(l.status))
    const hot = leads.filter(l => l.buying_intent === 'high' && !['closed_won', 'closed_lost'].includes(l.status))
    const wonValue = leads.filter(l => l.status === 'closed_won').reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)
    const pipeline = active.reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
    const recentActivity = interactions.filter(i => {
      const d = new Date(i.created_at)
      return Date.now() - d.getTime() < 24 * 60 * 60 * 1000
    })
    return { active: active.length, hot: hot.length, wonValue, pipeline, overdue: overdue.length, recentActivity: recentActivity.length }
  }, [leads, tasks, interactions])

  // ── AI insights from real data ──
  const insights = useMemo(() => {
    const list: { title: string; body: string; action: string; href: string }[] = []

    const hotLeads = leads.filter(l => l.buying_intent === 'high' && !['closed_won', 'closed_lost'].includes(l.status))
    if (hotLeads.length > 0) {
      list.push({
        title: `${hotLeads.length} high-intent lead${hotLeads.length > 1 ? 's' : ''} need attention`,
        body: hotLeads.slice(0, 3).map(l => l.full_name).join(', ') + (hotLeads.length > 3 ? ` +${hotLeads.length - 3} more` : '') + ' — reach out now to maximize close rate.',
        action: 'View leads',
        href: '/dashboard/leads',
      })
    }

    const overdueLeads = leads.filter(l => {
      if (!l.last_contacted_at) return false
      const daysSince = (Date.now() - new Date(l.last_contacted_at).getTime()) / 86400000
      return daysSince > 7 && !['closed_won', 'closed_lost'].includes(l.status)
    })
    if (overdueLeads.length > 0) {
      list.push({
        title: `${overdueLeads.length} leads haven't been contacted in 7+ days`,
        body: 'Stale leads lose intent. Consider a WhatsApp or email follow-up sequence to re-engage.',
        action: 'Follow up',
        href: '/dashboard/whatsapp',
      })
    }

    if (stats.overdue > 0) {
      list.push({
        title: `${stats.overdue} task${stats.overdue > 1 ? 's are' : ' is'} overdue`,
        body: 'Overdue tasks signal missed follow-ups. Complete or reschedule to keep your pipeline healthy.',
        action: 'View tasks',
        href: '/dashboard/tasks',
      })
    }

    const noInteractionLeads = leads.filter(l =>
      !interactions.some(i => i.lead_id === l.id) &&
      !['closed_won', 'closed_lost'].includes(l.status)
    )
    if (noInteractionLeads.length > 0) {
      list.push({
        title: `${noInteractionLeads.length} leads have no recorded interactions`,
        body: 'Log a call or WhatsApp message to start building context and improve scoring accuracy.',
        action: 'Log interaction',
        href: '/dashboard/interactions',
      })
    }

    const wonLeads = leads.filter(l => l.status === 'closed_won')
    if (wonLeads.length > 0 && stats.wonValue > 0) {
      list.push({
        title: `Revenue closed: ₹${(stats.wonValue / 100000).toFixed(1)}L`,
        body: `${wonLeads.length} deal${wonLeads.length > 1 ? 's' : ''} won. Analyze top-performing sources in Analytics to replicate success.`,
        action: 'View analytics',
        href: '/dashboard/analytics',
      })
    }

    if (list.length === 0) {
      list.push({
        title: 'Pipeline looks healthy',
        body: 'No critical alerts right now. Keep logging interactions and scoring leads to maintain visibility.',
        action: 'View pipeline',
        href: '/dashboard/pipeline',
      })
    }

    return list.slice(0, 5)
  }, [leads, interactions, tasks, stats])

  // ── Recent activity feed ──
  const recentInteractions = [...interactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="klinq"
        subtitle={isLoading ? 'Loading…' : `${leads.length} leads · ${interactions.length} interactions · Live`}
      />

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto w-full">

        {/* Top stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Active Leads"    value={stats.active}                   sub={`${leads.length} total`}                    icon={Users}       href="/dashboard/leads" />
              <StatCard label="Hot Leads"       value={stats.hot}                      sub="High intent"                                 icon={Target}      href="/dashboard/leads" />
              <StatCard label="Pipeline"        value={`₹${(stats.pipeline/100000).toFixed(1)}L`} sub="Open deals"                     icon={TrendingUp}  href="/dashboard/pipeline" />
              <StatCard label="Won Revenue"     value={`₹${(stats.wonValue/100000).toFixed(1)}L`} sub="All time"                       icon={Zap}         href="/dashboard/analytics" />
              <StatCard label="Open Tasks"      value={tasks.length}                   sub={`${stats.overdue} overdue`}                  icon={CheckSquare} href="/dashboard/tasks" />
              <StatCard label="Activity Today"  value={stats.recentActivity}           sub="Interactions"                               icon={Activity}    href="/dashboard/interactions" />
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* AI Insights — left 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">AI Insights</h2>
                <p className="text-xs text-muted-foreground">Derived from your live CRM data — no fake alerts</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="size-4 mr-1.5" />Refresh
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 flex items-start gap-3">
                      <Skeleton className="size-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))
                ) : (
                  insights.map((ins, i) => (
                    <InsightCard key={i} {...ins} />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Pipeline overview strip */}
            <div>
              <h2 className="text-sm font-semibold mb-3">Pipeline Snapshot</h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {['new', 'contacted', 'interested', 'negotiation', 'closed_won'].map(status => {
                  const count = leads.filter(l => l.status === status).length
                  const value = leads.filter(l => l.status === status).reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)
                  const label = { new: 'New', contacted: 'Contacted', interested: 'Interested', negotiation: 'Negotiation', closed_won: 'Won' }[status] || status
                  return (
                    <Link key={status} href="/dashboard/pipeline">
                      <Card className="hover:bg-muted/20 transition-colors cursor-pointer">
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
                          {value > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              ₹{value >= 100000 ? `${(value/100000).toFixed(1)}L` : `${(value/1000).toFixed(0)}K`}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right column — Tasks + Recent activity */}
          <div className="space-y-4">

            {/* Open tasks */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckSquare className="size-4 text-muted-foreground" />
                  Open Tasks
                </CardTitle>
                <Link href="/dashboard/tasks">
                  <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {tasksLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <CheckSquare className="size-8 mx-auto mb-2 opacity-30" />
                    No open tasks
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {tasks.slice(0, 5).map(task => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                      return (
                        <div key={task.id} className="px-4 py-3 flex items-start gap-3">
                          <div className={`size-2 rounded-full mt-1.5 shrink-0 ${isOverdue ? 'bg-foreground' : 'bg-muted-foreground/40'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{task.title}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{task.priority} priority</p>
                          </div>
                          {task.due_date && (
                            <span className={`text-[10px] shrink-0 ${isOverdue ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                              {isOverdue ? 'Overdue' : formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent interactions */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="size-4 text-muted-foreground" />
                  Recent Activity
                </CardTitle>
                <Link href="/dashboard/interactions">
                  <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {interactionsLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : recentInteractions.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <Activity className="size-8 mx-auto mb-2 opacity-30" />
                    No interactions yet
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentInteractions.map(i => (
                      <div key={i.id} className="px-4 py-3 flex items-start gap-3">
                        <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                          {i.type === 'call'     ? <Phone className="size-3 text-muted-foreground" />
                          : i.type === 'whatsapp' ? <MessageSquare className="size-3 text-muted-foreground" />
                          : <Activity className="size-3 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {(i.lead as any)?.full_name || 'Unknown lead'}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">{i.type}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 pt-0">
                {[
                  { label: 'Add Lead',     href: '/dashboard/leads',        icon: Users         },
                  { label: 'New Task',     href: '/dashboard/tasks',        icon: CheckSquare   },
                  { label: 'WhatsApp',     href: '/dashboard/whatsapp',     icon: MessageSquare },
                  { label: 'Analytics',   href: '/dashboard/analytics',    icon: BarChart3     },
                  { label: 'Score Leads', href: '/dashboard/scoring',      icon: BrainCircuit  },
                  { label: 'Pipeline',    href: '/dashboard/pipeline',     icon: TrendingUp    },
                ].map(a => (
                  <Link key={a.href} href={a.href}>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8">
                      <a.icon className="size-3.5 text-muted-foreground" />
                      {a.label}
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
