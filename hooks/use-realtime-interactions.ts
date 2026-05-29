'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InteractionLead {
  id: string
  full_name: string
  company: string | null
  phone_number: string | null
}

export interface Interaction {
  id: string
  user_id: string
  lead_id: string | null
  type: 'voice' | 'text' | 'image' | 'whatsapp' | 'call' | 'email' | 'meeting'
  direction: 'inbound' | 'outbound'
  content_raw: string | null
  content_transcribed: string | null
  sentiment_score: number | null
  ai_summary: string | null
  ai_extracted_data: Record<string, unknown> | null
  created_at: string
  lead?: InteractionLead | null
}

export function useRealtimeInteractions(typeFilter?: string) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInteractions = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('interactions')
      .select('*, lead:leads(id, full_name, company, phone_number)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (typeFilter) {
      query = query.eq('type', typeFilter)
    }

    const { data, error } = await query
    if (error || !data) {
      // RLS blocked — fall back to API route
      try {
        const url = typeFilter
          ? `/api/data?table=interactions&limit=100`
          : `/api/data?table=interactions&limit=100`
        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          const filtered = typeFilter ? (json.data || []).filter((i: any) => i.type === typeFilter) : (json.data || [])
          setInteractions((filtered as unknown as Interaction[]))
        }
      } catch { /* silent */ }
    } else {
      setInteractions((data as unknown as Interaction[]) || [])
    }
    setIsLoading(false)
  }, [typeFilter])

  const createInteraction = useCallback(async (payload: Partial<Interaction>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('interactions')
      .insert({ ...(payload as any), user_id: user.id })
      .select('*, lead:leads(id, full_name, company, phone_number)')
      .single()
    if (error) { console.error('Failed to create interaction:', error); return null }
    return data as unknown as Interaction
  }, [])

  useEffect(() => {
    fetchInteractions()
    const supabase = createClient()
    const channelName = `realtime-interactions-${crypto.randomUUID()}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interactions' },
        () => { fetchInteractions() }
      )
      .subscribe()

    // Fallback polling every 10 seconds
    const interval = setInterval(() => { fetchInteractions() }, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchInteractions])

  return { interactions, isLoading, error, refetch: fetchInteractions, createInteraction }
}
