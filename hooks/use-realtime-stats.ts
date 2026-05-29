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

    // Try direct Supabase first
    const { count: totalLeadsCheck, error: checkError } = await supabase
      .from('leads').select('*', { count: 'exact', head: true })

    if (checkError || totalLeadsCheck === null) {
      // RLS blocked — fall back to API route and compute stats from raw data
      try {
        const [leadsRes, tasksRes] = await Promise.all([
          fetch('/api/data?table=leads&limit=1000'),
          fetch('/api/data?table=tasks&limit=500'),
        ])
        if (leadsRes.ok && tasksRes.ok) {
          const { data: leads } = await leadsRes.json()
          const { data: tasks } = await tasksRes.json()
          const todayStr = today.toISOString()
          const tomorrowStr = tomorrow.toISOString()
          const closedWon = (leads || []).filter((l: any) => l.status === 'closed_won')
          const totalRevenue = closedWon.reduce((s: number, d: any) => s + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0)
          const totalLeads = (leads || []).length
          const newLeadsToday = (leads || []).filter((l: any) => l.created_at >= todayStr).length
          const tasksToday = (tasks || []).filter((t: any) => !t.is_completed && t.due_date >= todayStr && t.due_date < tomorrowStr).length
          const completedTasks = (tasks || []).filter((t: any) => t.is_completed).length
          const conversionRate = totalLeads > 0 ? Math.round((closedWon.length / totalLeads) * 1000) / 10 : 0
          setStats({ totalLeads, newLeadsToday, tasksToday, completedTasks, totalRevenue, conversionRate, activeInPipeline: 0 })
        }
      } catch { /* silent */ }
      setIsLoading(false)
      return
    }

    const [
      { count: totalLeads },
      { count: newLeadsToday },
      { count: tasksToday },
      { count: completedTasks },
      { data: closedDeals },
      { count: activeInPipeline },
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('is_completed', false).gte('due_date', today.toISOString()).lt('due_date', tomorrow.toISOString()),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('is_completed', true),
      supabase.from('leads').select('deal_value, estimated_budget').eq('status', 'closed_won'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '(closed_won,closed_lost)'),
    ])

    const totalRevenue = closedDeals?.reduce((s, d) => s + (Number(d.deal_value) || Number(d.estimated_budget) || 0), 0) || 0
    const closedWon = closedDeals?.length || 0
    const conversionRate = totalLeads && totalLeads > 0 ? Math.round((closedWon / totalLeads) * 1000) / 10 : 0

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

    // Fallback polling interval every 6 seconds to ensure data remains fresh
    const interval = setInterval(() => {
      fetchStats()
    }, 6000)

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
      clearInterval(interval)
    }
  }, [fetchStats])

  return { stats, isLoading }
}
