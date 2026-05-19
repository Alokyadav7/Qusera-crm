'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { CRMHeader } from '@/components/crm/crm-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'
import { TrendingUp, TrendingDown, Users, IndianRupee, Zap, MessageSquare, Target, Activity } from 'lucide-react'
import { format, subDays, startOfDay, isAfter } from 'date-fns'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1', contacted: '#8b5cf6', interested: '#06b6d4',
  verified: '#22c55e', negotiation: '#f59e0b',
  closed_won: '#10b981', closed_lost: '#ef4444',
}

function StatCard({ title, value, sub, icon: Icon, trend, color = 'primary' }: {
  title: string; value: string | number; sub: string
  icon: React.ElementType; trend?: number; color?: string
}) {
  const trendPositive = trend !== undefined && trend >= 0
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 opacity-[0.03] bg-gradient-to-br from-${color}-500 to-${color}-600`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`flex size-10 items-center justify-center rounded-xl bg-primary/10`}>
            <Icon className="size-5 text-primary" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend)}% vs last 7 days
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { leads, isLoading: leadsLoading } = useRealtimeLeads()
  const { interactions, isLoading: intLoading } = useRealtimeInteractions()

  // ── Computed metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date()
    const last7 = subDays(now, 7)
    const last14 = subDays(now, 14)

    const recentLeads = leads.filter(l => isAfter(new Date(l.created_at), last7))
    const prevLeads = leads.filter(l => isAfter(new Date(l.created_at), last14) && !isAfter(new Date(l.created_at), last7))
    const leadTrend = prevLeads.length ? Math.round(((recentLeads.length - prevLeads.length) / prevLeads.length) * 100) : 0

    const wonLeads = leads.filter(l => l.status === 'closed_won')
    const totalRevenue = wonLeads.reduce((s, l) => s + (l.deal_value || l.estimated_budget || 0), 0)

    const recentInt = interactions.filter(i => isAfter(new Date(i.created_at), last7))
    const prevInt = interactions.filter(i => isAfter(new Date(i.created_at), last14) && !isAfter(new Date(i.created_at), last7))
    const intTrend = prevInt.length ? Math.round(((recentInt.length - prevInt.length) / prevInt.length) * 100) : 0

    const hotLeads = leads.filter(l => l.buying_intent === 'high')
    const conversionRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 0

    return { recentLeads, leadTrend, totalRevenue, wonLeads, recentInt, intTrend, hotLeads, conversionRate }
  }, [leads, interactions])

  // ── Leads over last 14 days (area chart) ───────────────────────────────────
  const leadsTimeline = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i)
      const dayStart = startOfDay(d)
      const dayEnd = startOfDay(subDays(d, -1))
      const count = leads.filter(l => {
        const c = new Date(l.created_at)
        return c >= dayStart && c < dayEnd
      }).length
      const interactions_count = interactions.filter(i => {
        const c = new Date(i.created_at)
        return c >= dayStart && c < dayEnd
      }).length
      return { date: format(d, 'MMM d'), leads: count, interactions: interactions_count }
    })
    return days
  }, [leads, interactions])

  // ── Leads by status (bar chart) ─────────────────────────────────────────────
  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({
      status: status.replace('_', ' '),
      count,
      fill: STATUS_COLORS[status] || '#6366f1'
    }))
  }, [leads])

  // ── Intent distribution (pie) ────────────────────────────────────────────────
  const intentDist = useMemo(() => {
    const high = leads.filter(l => l.buying_intent === 'high').length
    const medium = leads.filter(l => l.buying_intent === 'medium').length
    const low = leads.filter(l => l.buying_intent === 'low').length
    return [
      { name: 'High Intent', value: high, color: '#22c55e' },
      { name: 'Medium Intent', value: medium, color: '#f59e0b' },
      { name: 'Low Intent', value: low, color: '#ef4444' },
    ].filter(d => d.value > 0)
  }, [leads])

  // ── Interaction types (pie) ───────────────────────────────────────────────────
  const intByType = useMemo(() => {
    const counts: Record<string, number> = {}
    interactions.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1 })
    return Object.entries(counts).map(([type, value], idx) => ({ name: type, value, color: COLORS[idx % COLORS.length] }))
  }, [interactions])

  // ── Revenue forecast (bar, top 5 deals) ──────────────────────────────────────
  const topDeals = useMemo(() =>
    leads
      .filter(l => (l.deal_value || l.estimated_budget || 0) > 0)
      .sort((a, b) => (b.deal_value || b.estimated_budget || 0) - (a.deal_value || a.estimated_budget || 0))
      .slice(0, 8)
      .map(l => ({
        name: l.full_name.split(' ')[0],
        value: Math.round((l.deal_value || l.estimated_budget || 0) / 1000),
        status: l.status,
      })),
  [leads])

  const formatRupees = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
    return `₹${n}`
  }

  if (leadsLoading || intLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="Analytics" subtitle="Loading real-time data…" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Crunching your numbers…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Analytics"
        subtitle={`Live data · ${leads.length} leads · ${interactions.length} interactions`}
      />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Live badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
            <span className="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />Live
          </Badge>
          <span className="text-sm text-muted-foreground">Updates automatically as you add leads and interactions</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Leads" value={leads.length} sub={`+${metrics.recentLeads.length} this week`} icon={Users} trend={metrics.leadTrend} />
          <StatCard title="Revenue Won" value={formatRupees(metrics.totalRevenue)} sub={`${metrics.wonLeads.length} deals closed`} icon={IndianRupee} />
          <StatCard title="Hot Leads" value={metrics.hotLeads.length} sub={`${leads.length ? Math.round((metrics.hotLeads.length / leads.length) * 100) : 0}% of pipeline`} icon={Zap} />
          <StatCard title="Conversion Rate" value={`${metrics.conversionRate}%`} sub={`${metrics.intTrend >= 0 ? '+' : ''}${metrics.intTrend}% interactions`} icon={Target} trend={metrics.intTrend} />
        </div>

        {/* Area Chart — Leads + Interactions Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="size-4 text-primary" />Activity — Last 14 Days</CardTitle>
            <CardDescription>Daily leads acquired and interactions recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsTimeline.every(d => d.leads === 0 && d.interactions === 0) ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No activity yet — add your first lead to see charts</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={leadsTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Area type="monotone" dataKey="leads" name="New Leads" stroke="#6366f1" fill="url(#leadGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="interactions" name="Interactions" stroke="#22c55e" fill="url(#intGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Row 2: Status Bar + Intent Pie */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline by Status</CardTitle>
              <CardDescription>Lead count per stage</CardDescription>
            </CardHeader>
            <CardContent>
              {byStatus.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No leads yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byStatus} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                      {byStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buying Intent Distribution</CardTitle>
              <CardDescription>How ready your leads are to buy</CardDescription>
            </CardHeader>
            <CardContent>
              {intentDist.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No leads yet</div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="55%" height={180}>
                    <PieChart>
                      <Pie data={intentDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none">
                        {intentDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {intentDist.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="size-3 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-sm">{d.name}</span>
                        <span className="text-sm font-bold ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Revenue Forecast + Interaction Types */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><IndianRupee className="size-4 text-emerald-600" />Top Deals Pipeline (₹K)</CardTitle>
              <CardDescription>Top 8 leads by deal value</CardDescription>
            </CardHeader>
            <CardContent>
              {topDeals.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No deal values set yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topDeals} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v: number) => [`₹${v}K`, 'Value']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" name="Deal Value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="size-4 text-blue-600" />Interactions by Type</CardTitle>
              <CardDescription>Breakdown of all communication channels</CardDescription>
            </CardHeader>
            <CardContent>
              {intByType.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No interactions recorded yet</div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="55%" height={180}>
                    <PieChart>
                      <Pie data={intByType} cx="50%" cy="50%" outerRadius={75} dataKey="value" stroke="none">
                        {intByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {intByType.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="size-3 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-sm capitalize">{d.name}</span>
                        <span className="text-sm font-bold ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
