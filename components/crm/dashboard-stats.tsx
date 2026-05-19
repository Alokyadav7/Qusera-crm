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
      label: 'Active',
      value: (data as typeof data & { activeInPipeline?: number }).activeInPipeline !== undefined
        ? String((data as typeof data & { activeInPipeline: number }).activeInPipeline)
        : data.totalLeads > 0 ? Math.round(data.totalLeads * 0.7).toString() : '0',
      change: 'In pipeline',
      changeType: 'positive' as const,
      icon: Zap,
      iconBg: 'bg-amber-50 dark:bg-amber-950',
      iconColor: 'text-amber-600'
    }
  ]

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 animate-fade-in-up">
      {statItems.map((stat, i) => (
        <Card key={stat.label} className="glass-card card-hover overflow-hidden border-border/50 shadow-sm shadow-primary/5 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  {stat.label}
                  {isLoading && <Loader2 className="size-2.5 animate-spin" />}
                </span>
                <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                <span className={`text-xs ${
                  stat.changeType === 'positive' ? 'text-emerald-600' :
                  stat.changeType === 'warning' ? 'text-amber-600' :
                  stat.changeType === 'negative' ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {stat.changeType === 'positive' && <TrendingUp className="inline size-3 mr-1" />}
                  {stat.changeType === 'negative' && <TrendingDown className="inline size-3 mr-1" />}
                  {stat.change}
                </span>
              </div>
              <div className={`flex size-10 items-center justify-center rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`size-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
