'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface Lead {
  id: string
  user_id: string
  full_name: string
  phone_number: string | null
  email: string | null
  company: string | null
  status: 'new' | 'contacted' | 'interested' | 'verified' | 'negotiation' | 'closed_won' | 'closed_lost'
  source: string | null
  sentiment_score: number
  buying_intent: 'high' | 'medium' | 'low'
  ai_summary: string | null
  estimated_budget: number | null
  deal_value: number | null
  city: string | null
  state: string | null
  address: string | null
  pincode: string | null
  preferred_language: string | null
  last_contacted_at: string | null
  // Compliance fields
  gstin: string | null
  gst_status: 'verified' | 'pending' | 'invalid'
  pan_number: string | null
  pan_status: 'verified' | 'pending' | 'invalid'
  aadhaar_verified: boolean
  bank_verified: boolean
  // Metadata
  tags: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function useRealtimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setLeads((data as Lead[]) || [])
    }
    setIsLoading(false)
  }, [])

  const updateLeadStatus = useCallback(async (id: string, status: Lead['status']) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Failed to move lead: ' + error.message)
    } else {
      const label = status.replace('_', ' ')
      toast.success(`Lead moved to ${label.charAt(0).toUpperCase() + label.slice(1)} ✓`)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    const supabase = createClient()

    const channel = supabase
      .channel('realtime-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads(prev => [payload.new as Lead, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(l => l.id === (payload.new as Lead).id ? payload.new as Lead : l))
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== (payload.old as Lead).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLeads])

  return { leads, isLoading, error, refetch: fetchLeads, updateLeadStatus }
}
