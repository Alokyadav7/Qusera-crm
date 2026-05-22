'use client'

import { Users, Flame, CheckSquare, IndianRupee, TrendingUp, TrendingDown, Target, Zap, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useRealtimeStats } from '@/hooks/use-realtime-stats'

interface StatsProps {
  // Optional initial data from server; will be replaced by realtime hook immediately
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

  // Use realtime stats, fall back to server-provided initial stats while loading
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
      icon: Users,
      iconBg: 'bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-600'
    },
    {
      label: 'New Today',
      value: data.newLeadsToday.toString(),
      change: 'Fresh leads',
      changeType: data.newLeadsToday > 0 ? 'positive' : 'neutral' as const,
      icon: Flame,
      iconBg: 'bg-orange-50 dark:bg-orange-950',
      iconColor: 'text-orange-600'
    },
    {
      label: 'Tasks Today',
      value: data.tasksToday.toString(),
      change: data.tasksToday > 0 ? 'Pending' : 'All done! ✅',
      changeType: data.tasksToday > 0 ? 'warning' : 'positive' as const,
      icon: CheckSquare,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950',
      iconColor: 'text-emerald-600'
    },
    {
      label: 'Completed',
      value: data.completedTasks.toString(),
      change: 'Tasks done',
      changeType: 'positive' as const,
      icon: Target,
      iconBg: 'bg-purple-50 dark:bg-purple-950',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Revenue',
      value: formatIndianCurrency(data.totalRevenue),
      change: 'From closed deals',
      changeType: data.totalRevenue > 0 ? 'positive' : 'neutral' as const,
      icon: IndianRupee,
      iconBg: 'bg-green-50 dark:bg-green-950',
      iconColor: 'text-green-600'
    },
    {
      label: 'Conversion',
      value: `${data.conversionRate}%`,
      change: 'Win rate',
      changeType: data.conversionRate > 20 ? 'positive' : data.conversionRate > 10 ? 'neutral' : 'warning' as const,
      icon: TrendingUp,
      iconBg: 'bg-cyan-50 dark:bg-cyan-950',
      iconColor: 'text-cyan-600'
    },
    {
      label: 'Avg Score',
      value: data.totalLeads > 0
        ? `${Math.min(100, Math.round(
            (data as typeof data & { avgScore?: number }).avgScore ??
            data.conversionRate
          ))}/100`
        : '—',
      change: 'Lead quality',
      changeType: 'positive' as const,
      icon: Zap,
      iconBg: 'bg-amber-50 dark:bg-amber-950',
      iconColor: 'text-amber-600'
    }
  ]

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 animate-fade-in-up">
      {statItems.map((stat, i) => (
        <Card key={stat.label} className="glass-card card-hover overflow-hidden border-border/50 shadow-sm shadow-primary/5 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                {stat.label}
                {isLoading && <Loader2 className="size-2.5 animate-spin" />}
              </span>
              <div className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${stat.iconBg}`}>
                <stat.icon className={`size-4.5 ${stat.iconColor}`} />
              </div>
            </div>
            
            <div className="mt-2.5">
              <span className="text-xl font-extrabold tracking-tight block text-foreground leading-none">{stat.value}</span>
              <span className={`text-[10px] mt-1.5 block font-medium ${
                stat.changeType === 'positive' ? 'text-emerald-500' :
                stat.changeType === 'warning' ? 'text-amber-500' :
                stat.changeType === 'negative' ? 'text-red-500' :
                'text-muted-foreground'
              }`}>
                {stat.changeType === 'positive' && <TrendingUp className="inline size-2.5 mr-0.5" />}
                {stat.changeType === 'negative' && <TrendingDown className="inline size-2.5 mr-0.5" />}
                {stat.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
