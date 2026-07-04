'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Send, Phone, MessageSquare, Search, Check, CheckCheck, AlertTriangle, Loader2, WifiOff, User } from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WALead {
  id: string
  full_name: string | null
  phone: string | null
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

export interface WAMessage {
  id: string
  lead_id: string | null
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  message_text: string | null
  message_type: string
  status: 'sent' | 'delivered' | 'read' | 'received' | 'failed'
  received_at: string | null
  created_at: string
}

interface Props {
  companyId: string
  isConnected: boolean
  waPhone?: string
  initialLeads: WALead[]
}

// ─── Message status indicator ─────────────────────────────────────────────────

function MessageStatus({ status }: { status: WAMessage['status'] }) {
  if (status === 'read') return <CheckCheck className="size-3 text-[#53bdeb]" />
  if (status === 'delivered') return <CheckCheck className="size-3 text-zinc-400" />
  if (status === 'sent') return <Check className="size-3 text-zinc-400" />
  if (status === 'failed') return <AlertTriangle className="size-3 text-red-400" />
  return null
}

// ─── Time formatter ───────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// ─── Avatar initials ──────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const sz = size === 'sm' ? 'size-8 text-[10px]' : 'size-10 text-xs'
  return (
    <div className={`${sz} rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center font-bold text-violet-300 shrink-0`}>
      {initials || <User className="size-3.5" />}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WhatsAppInboxClient({ companyId, isConnected, waPhone, initialLeads }: Props) {
  const [leads, setLeads] = useState<WALead[]>(initialLeads)
  const [selectedLead, setSelectedLead] = useState<WALead | null>(null)
  const [messages, setMessages] = useState<WAMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch messages for selected lead
  const fetchMessages = useCallback(async (leadId: string) => {
    setLoadingMsgs(true)
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('whatsapp_messages')
      .select('*')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
    setMessages((data as WAMessage[]) ?? [])
    setLoadingMsgs(false)
  }, [companyId])

  // Realtime subscription for selected conversation
  useEffect(() => {
    if (!selectedLead) return
    fetchMessages(selectedLead.id)

    const supabase = createClient()
    const channel = supabase
      .channel(`wa-conv-${selectedLead.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `lead_id=eq.${selectedLead.id}`,
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new as WAMessage])
          // Update last message in leads list
          setLeads(prev => prev.map(l =>
            l.id === selectedLead.id
              ? { ...l, last_message: payload.new.message_text, last_message_at: payload.new.created_at }
              : l
          ))
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m =>
            m.id === payload.new.id ? { ...m, ...payload.new } : m
          ))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedLead, fetchMessages])

  // Realtime: new inbound leads (from webhook creating new records)
  useEffect(() => {
    if (!isConnected) return
    const supabase = createClient()
    const channel = supabase
      .channel(`wa-inbox-${companyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `company_id=eq.${companyId}`,
      }, (payload: any) => {
        const msg = payload.new as WAMessage
        if (msg.direction !== 'inbound') return
        // Pull fresh lead list when new inbound arrives
        refreshLeads()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [companyId, isConnected])

  const refreshLeads = async () => {
    const supabase = createClient()
    const { data: msgs, error: msgsErr } = await (supabase as any)
      .from('whatsapp_messages')
      .select('lead_id, message_text, created_at, direction')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (msgsErr || !msgs) return

    const leadMap = new Map<string, { last_message: string; last_message_at: string }>()
    for (const msg of msgs) {
      if (msg.lead_id && !leadMap.has(msg.lead_id)) {
        leadMap.set(msg.lead_id, {
          last_message: msg.message_text ?? '',
          last_message_at: msg.created_at,
        })
      }
    }

    if (leadMap.size === 0) {
      setLeads([])
      return
    }

    const leadIds = Array.from(leadMap.keys())
    const { data: leadRows, error: leadsErr } = await (supabase as any)
      .from('leads')
      .select('id, full_name, phone')
      .in('id', leadIds)
      .eq('company_id', companyId)

    if (leadsErr || !leadRows) return

    const resolvedLeads = leadRows.map((l: any) => ({
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      ...leadMap.get(l.id),
    }))

    resolvedLeads.sort((a: any, b: any) =>
      new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime()
    )

    setLeads(resolvedLeads)
  }

  const handleSend = async () => {
    if (!selectedLead || !inputText.trim() || sending) return
    const text = inputText.trim()
    setInputText('')
    setSending(true)

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: selectedLead.id, message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'WA_NOT_CONNECTED') {
          toast.error('WhatsApp not connected. Go to Settings → Integrations.')
        } else if (data.code === 'TOKEN_EXPIRED') {
          toast.error('WhatsApp token expired. Please reconnect in Settings → Integrations.')
        } else {
          toast.error(data.error ?? 'Failed to send message')
        }
        setInputText(text) // restore
      }
    } catch {
      toast.error('Network error. Please try again.')
      setInputText(text)
    } finally {
      setSending(false)
    }
  }

  const filteredLeads = leads.filter(l => {
    const q = search.toLowerCase()
    return (
      (l.full_name ?? '').toLowerCase().includes(q) ||
      (l.phone ?? '').includes(q)
    )
  })

  // ── Not connected banner ────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <div className="size-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
          <WifiOff className="size-7 text-zinc-600" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight mb-2">WhatsApp Not Connected</h2>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed mb-6">
          Connect your company's WhatsApp Business number to start sending and receiving messages.
        </p>
        <Link
          href="/dashboard/integrations"
          className="inline-flex items-center gap-2 bg-white text-zinc-950 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="size-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.882l6.196-1.624A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.002-1.368l-.36-.214-3.68.965.981-3.594-.235-.37A9.819 9.819 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
          </svg>
          Connect WhatsApp
        </Link>
      </div>
    )
  }

  // ── Main inbox layout ───────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Conversation list ─────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-zinc-800/80 flex flex-col bg-zinc-950/40">
        {/* Header */}
        <div className="px-4 py-4 border-b border-zinc-800/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">WhatsApp Inbox</p>
            {waPhone && (
              <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                {waPhone}
              </span>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageSquare className="size-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-600">
                {search ? 'No conversations match your search.' : 'No conversations yet. Messages will appear here when someone contacts you.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/40">
              {filteredLeads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                    selectedLead?.id === lead.id
                      ? 'bg-white/[0.04] border-l-2 border-l-violet-500'
                      : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                  }`}
                >
                  <Avatar name={lead.full_name ?? lead.phone ?? '?'} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {lead.full_name ?? lead.phone}
                      </p>
                      {lead.last_message_at && (
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {fmtTime(lead.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-xs text-zinc-500 truncate">
                        {lead.last_message ?? lead.phone ?? ''}
                      </p>
                      {(lead.unread_count ?? 0) > 0 && (
                        <span className="shrink-0 size-4 rounded-full bg-[#25D366] text-[9px] font-bold text-white flex items-center justify-center">
                          {lead.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Conversation thread ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/20">
        {selectedLead ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/20">
              <Avatar name={selectedLead.full_name ?? selectedLead.phone ?? '?'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {selectedLead.full_name ?? selectedLead.phone}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Phone className="size-3" />
                  {selectedLead.phone ?? 'No phone'}
                </div>
              </div>
              <Link
                href={`/dashboard/leads/${selectedLead.id}`}
                className="text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                View Lead →
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="size-5 animate-spin text-zinc-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="size-8 text-zinc-700 mb-2" />
                  <p className="text-xs text-zinc-600">No messages yet. Send the first message below.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOutbound = msg.direction === 'outbound'
                  const time = fmtTime(msg.created_at)
                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[68%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          isOutbound
                            ? 'bg-[#25D366]/90 text-white rounded-tr-md'
                            : 'bg-zinc-800/80 text-zinc-100 rounded-tl-md'
                        }`}
                      >
                        {msg.message_text && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${isOutbound ? 'text-white/70' : 'text-zinc-500'}`}>
                            {time}
                          </span>
                          {isOutbound && <MessageStatus status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-900/30">
              <div className="flex items-end gap-2">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors min-h-[42px] max-h-[120px]"
                  style={{ height: 'auto' }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="size-10 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  {sending
                    ? <Loader2 className="size-4 text-white animate-spin" />
                    : <Send className="size-4 text-white" />
                  }
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="size-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <MessageSquare className="size-7 text-zinc-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-400 mb-1">Select a conversation</p>
            <p className="text-xs text-zinc-600 max-w-xs">
              Choose a contact from the left panel to view their WhatsApp messages.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
