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
    if (error) {
      setError(error.message)
    } else {
      setInteractions((data as Interaction[]) || [])
    }
    setIsLoading(false)
  }, [typeFilter])

  const createInteraction = useCallback(async (payload: Partial<Interaction>) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('interactions')
      .insert({ ...payload, user_id: user.id })
      .select('*, lead:leads(id, full_name, company, phone_number)')
      .single()
    if (error) { console.error('Failed to create interaction:', error); return null }
    return data as Interaction
  }, [])

  useEffect(() => {
    fetchInteractions()
    const supabase = createClient()

    const channel = supabase
      .channel('realtime-interactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interactions' },
        () => {
          // Re-fetch to get joined lead data on any change
          fetchInteractions()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchInteractions])

  return { interactions, isLoading, error, refetch: fetchInteractions, createInteraction }
}
