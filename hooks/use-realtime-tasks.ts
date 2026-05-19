'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RealtimeTaskLead {
  full_name: string
  company: string | null
}

export interface RealtimeTask {
  id: string
  title: string
  description: string | null
  due_date: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  is_completed: boolean
  task_type: string
  location_address?: string | null
  lead?: RealtimeTaskLead | null
}

export function useRealtimeTasks(initialTasks: RealtimeTask[] = []) {
  const [tasks, setTasks] = useState<RealtimeTask[]>(initialTasks)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*, lead:leads(full_name, company)')
      .order('due_date', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setTasks((data as RealtimeTask[]) || [])
      setError(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()
    const supabase = createClient()
    const channelName = `realtime-tasks-hook-${crypto.randomUUID()}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  return { tasks, isLoading, error, refetch: fetchTasks }
}
