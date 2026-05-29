'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Flame, CheckSquare, IndianRupee, TrendingUp, Target, Zap, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface KPIData {
  total_leads: number
  new_leads_30d: number
  open_deals_value: number
  tasks_due_today: number
  conversion_rate: number
  active_pipeline: number
  won_this_month: number
  total_revenue: number
}

function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`
  return `₹${amount}`
}

function KPISkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="border border-border/80 bg-card rounded-lg shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
            <div className="h-2.5 w-16 bg-muted animate-pulse rounded" />
            <div className="mt-4 space-y-2">
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              <div className="h-2 w-14 bg-muted/50 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface StatsProps {
  stats?: {
    totalLeads: number
    newLeadsToday: number
    tasksToday: number
    completedTasks: number
    totalRevenue: number
    conversionRate: number
  }
}

export function DashboardStats({ stats: _initialStats }: StatsProps) {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchKPIs = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/kpis', { cache: 'no-store' })
      if (res.ok) {
        const data: KPIData = await res.json()
        setKpis(data)
      }
    } catch { /* silent — show last known data */ }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    fetchKPIs()
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchKPIs, 60_000)
    return () => clearInterval(interval)
  }, [fetchKPIs])

  if (isLoading && !kpis) return <KPISkeleton />

  const d = kpis ?? {
    total_leads: 0, new_leads_30d: 0, open_deals_value: 0,
    tasks_due_today: 0, conversion_rate: 0, active_pipeline: 0,
    won_this_month: 0, total_revenue: 0,
  }

  const statItems = [
    {
      label: 'Total Leads',
      value: d.total_leads.toString(),
      change: d.new_leads_30d > 0 ? `+${d.new_leads_30d} last 30d` : 'No recent leads',
      changeType: d.new_leads_30d > 0 ? 'positive' : 'neutral',
      icon: Users,
    },
    {
      label: 'Active Pipeline',
      value: d.active_pipeline.toString(),
      change: 'Open deals',
      changeType: d.active_pipeline > 0 ? 'positive' : 'neutral',
      icon: Activity,
    },
    {
      label: 'Pipeline Value',
      value: formatINR(d.open_deals_value),
      change: 'Open deal value',
      changeType: d.open_deals_value > 0 ? 'positive' : 'neutral',
      icon: IndianRupee,
    },
    {
      label: 'Tasks Today',
      value: d.tasks_due_today.toString(),
      change: d.tasks_due_today > 0 ? 'Pending due today' : 'All clear!',
      changeType: d.tasks_due_today > 0 ? 'warning' : 'positive',
      icon: CheckSquare,
    },
    {
      label: 'Won This Month',
      value: formatINR(d.won_this_month),
      change: 'Revenue this month',
      changeType: d.won_this_month > 0 ? 'positive' : 'neutral',
      icon: Target,
    },
    {
      label: 'Total Revenue',
      value: formatINR(d.total_revenue),
      change: 'All closed won',
      changeType: d.total_revenue > 0 ? 'positive' : 'neutral',
      icon: Flame,
    },
    {
      label: 'Win Rate',
      value: `${d.conversion_rate}%`,
      change: 'Conversion rate',
      changeType: d.conversion_rate > 20 ? 'positive' : d.conversion_rate > 10 ? 'neutral' : 'warning',
      icon: TrendingUp,
    },
  ] as const

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {statItems.map((stat) => (
        <Card key={stat.label} className="border border-border/80 bg-card rounded-lg shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <stat.icon className="size-4 text-muted-foreground shrink-0" />
            </div>
            <div className="mt-4">
              <span className="text-xl font-bold tracking-tight block text-foreground leading-none">
                {stat.value}
              </span>
              <span className={`text-[10px] mt-2 block font-medium ${
                stat.changeType === 'positive' ? 'text-emerald-600 dark:text-emerald-500' :
                stat.changeType === 'warning' ? 'text-amber-600 dark:text-amber-500' :
                'text-muted-foreground/80'
              }`}>
                {stat.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
