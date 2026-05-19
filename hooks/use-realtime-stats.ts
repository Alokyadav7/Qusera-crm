'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  totalLeads: number
  newLeadsToday: number
  tasksToday: number
  completedTasks: number
  totalRevenue: number
  conversionRate: number
  activeInPipeline: number
}

export function useRealtimeStats(): { stats: Stats; isLoading: boolean } {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    newLeadsToday: 0,
    tasksToday: 0,
    completedTasks: 0,
    totalRevenue: 0,
    conversionRate: 0,
    activeInPipeline: 0,
  })

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      { count: totalLeads },
      { count: newLeadsToday },
      { count: tasksToday },
      { count: completedTasks },
      { data: closedDeals },
      { count: activeInPipeline },
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .gte('due_date', today.toISOString())
        .lt('due_date', tomorrow.toISOString()),
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('is_completed', true),
      supabase.from('leads').select('deal_value').eq('status', 'closed_won'),
      supabase.from('leads').select('*', { count: 'exact', head: true })
        .not('status', 'in', '("closed_won","closed_lost")'),
    ])

    const totalRevenue = closedDeals?.reduce((s, d) => s + (Number(d.deal_value) || 0), 0) || 0
    const closedWon = closedDeals?.length || 0
    const conversionRate = totalLeads && totalLeads > 0
      ? Math.round((closedWon / totalLeads) * 1000) / 10
      : 0

    setStats({
      totalLeads: totalLeads || 0,
      newLeadsToday: newLeadsToday || 0,
      tasksToday: tasksToday || 0,
      completedTasks: completedTasks || 0,
      totalRevenue,
      conversionRate,
      activeInPipeline: activeInPipeline || 0,
    })
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
    const supabase = createClient()
    const channelId = crypto.randomUUID()

    // Subscribe to all table changes to update stats in real time
    const channels = [
      supabase.channel(`stats-leads-${channelId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchStats).subscribe(),
      supabase.channel(`stats-tasks-${channelId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchStats).subscribe(),
    ]

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [fetchStats])

  return { stats, isLoading }
}
