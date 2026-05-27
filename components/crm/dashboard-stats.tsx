'use client'

import { Users, Flame, CheckSquare, IndianRupee, TrendingUp, TrendingDown, Target, Zap, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useRealtimeStats } from '@/hooks/use-realtime-stats'

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

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

export function DashboardStats({ stats: initialStats }: StatsProps) {
  const { stats, isLoading } = useRealtimeStats()

  const data = stats || initialStats || {
    totalLeads: 0, newLeadsToday: 0, tasksToday: 0,
    completedTasks: 0, totalRevenue: 0, conversionRate: 0,
  }

  const statItems = [
    {
      label: 'Total Leads',
      value: data.totalLeads.toString(),
      change: data.newLeadsToday > 0 ? `+${data.newLeadsToday} today` : 'No new leads',
      changeType: data.newLeadsToday > 0 ? 'positive' : 'neutral' as const,
      icon: Users
    },
    {
      label: 'New Today',
      value: data.newLeadsToday.toString(),
      change: 'Fresh leads',
      changeType: data.newLeadsToday > 0 ? 'positive' : 'neutral' as const,
      icon: Flame
    },
    {
      label: 'Tasks Today',
      value: data.tasksToday.toString(),
      change: data.tasksToday > 0 ? 'Pending' : 'All done!',
      changeType: data.tasksToday > 0 ? 'warning' : 'positive' as const,
      icon: CheckSquare
    },
    {
      label: 'Completed',
      value: data.completedTasks.toString(),
      change: 'Tasks done',
      changeType: 'positive' as const,
      icon: Target
    },
    {
      label: 'Revenue',
      value: formatIndianCurrency(data.totalRevenue),
      change: 'From closed deals',
      changeType: data.totalRevenue > 0 ? 'positive' : 'neutral' as const,
      icon: IndianRupee
    },
    {
      label: 'Conversion',
      value: `${data.conversionRate}%`,
      change: 'Win rate',
      changeType: data.conversionRate > 20 ? 'positive' : data.conversionRate > 10 ? 'neutral' : 'warning' as const,
      icon: TrendingUp
    },
    {
      label: 'Avg Score',
      value: data.totalLeads > 0
        ? `${Math.min(100, Math.round(
            (data as any).avgScore ?? data.conversionRate
          ))}/100`
        : '—',
      change: 'Lead quality',
      changeType: 'positive' as const,
      icon: Zap
    }
  ]

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {statItems.map((stat, i) => (
        <Card key={stat.label} className="border border-border/80 bg-card rounded-lg shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                {stat.label}
                {isLoading && <Loader2 className="size-2.5 animate-spin text-muted-foreground/50" />}
              </span>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            
            <div className="mt-4">
              <span className="text-xl font-bold tracking-tight block text-foreground leading-none">{stat.value}</span>
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
