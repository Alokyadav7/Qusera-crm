'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CRMNotification {
  id: string
  company_id: string | null
  user_id: string
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  read: boolean
  created_at: string
}

export function useNotifications(companyId: string | null) {
  const [notifications, setNotifications] = useState<CRMNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        const ns = (data as CRMNotification[])
        setNotifications(ns)
        setUnread(ns.filter(n => !n.read).length)
      } else {
        // Fallback via API
        const res = await fetch('/api/data?table=notifications&limit=50')
        if (res.ok) {
          const json = await res.json()
          const ns = (json.data || []) as CRMNotification[]
          setNotifications(ns)
          setUnread(ns.filter(n => !n.read).length)
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))

    const supabase = createClient()
    await (supabase as any).from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase as any).from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }, [])

  useEffect(() => {
    refresh()

    const supabase = createClient()
    const channelId = `notifications-${crypto.randomUUID()}`

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNote = payload.new as CRMNotification
          setNotifications(prev => [newNote, ...prev].slice(0, 50))
          setUnread(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const updated = payload.new as CRMNotification
          const wasUnread = !(payload.old as any)?.read
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n))
          if (wasUnread && updated.read) {
            setUnread(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  return { notifications, unread, loading, refresh, markRead, markAllRead }
}
