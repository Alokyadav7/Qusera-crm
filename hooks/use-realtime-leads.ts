'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface Lead {
  id: string
  user_id: string
  company_id?: string | null
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
  gstin: string | null
  gst_status: 'verified' | 'pending' | 'invalid'
  pan_number: string | null
  pan_status: 'verified' | 'pending' | 'invalid'
  aadhaar_verified: boolean
  bank_verified: boolean
  tags: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function useRealtimeLeads(initialLeads: Lead[] = []) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error || !data) {
        const res = await fetch('/api/data?table=leads&orderBy=created_at&ascending=false&limit=500')
        if (res.ok) {
          const json = await res.json()
          setLeads((json.data as unknown as Lead[]) || [])
          setError(null)
        } else {
          setError('Failed to fetch leads')
        }
      } else {
        setLeads((data as unknown as Lead[]) || [])
        setError(null)
      }
    } catch (err: any) {
      try {
        const res = await fetch('/api/data?table=leads&orderBy=created_at&ascending=false&limit=500')
        if (res.ok) {
          const json = await res.json()
          setLeads((json.data as unknown as Lead[]) || [])
          setError(null)
        }
      } catch {
        setError(err.message || 'Failed to fetch leads')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * updateLeadStatus — Optimistically updates UI then persists via PATCH /api/deals/[id].
   * Reverts on error, shows toast on both success and failure.
   */
  const updateLeadStatus = useCallback(async (id: string, status: Lead['status']) => {
    // Snapshot previous state for revert
    const prevLeads = leads
    const prevLead = leads.find(l => l.id === id)

    // Optimistic UI update
    setLeads(prev => prev.map(l =>
      l.id === id ? { ...l, status, updated_at: new Date().toISOString() } : l
    ))

    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: status,
          from_stage: prevLead?.status,
          company_id: prevLead?.company_id,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        // Revert optimistic update
        setLeads(prevLeads)
        toast.error('Failed to update: ' + (err.error || 'Unknown error'))
        return
      }

      const label = status.replace(/_/g, ' ')
      toast.success(`Deal moved to ${label.charAt(0).toUpperCase() + label.slice(1)} ✓`)
    } catch (err: any) {
      setLeads(prevLeads)
      toast.error('Failed to update: ' + (err.message || 'Network error'))
    }
  }, [leads])

  useEffect(() => {
    fetchLeads()
    const supabase = createClient()
    const channelName = `realtime-leads-${crypto.randomUUID()}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads(prev => [payload.new as unknown as Lead, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(l => l.id === (payload.new as any).id ? payload.new as unknown as Lead : l))
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== (payload.old as any).id))
          }
        }
      )
      .subscribe()

    // Fallback polling every 30 seconds (less aggressive — real-time handles updates)
    const interval = setInterval(() => { fetchLeads() }, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchLeads])

  return { leads, isLoading, error, refetch: fetchLeads, updateLeadStatus }
}
