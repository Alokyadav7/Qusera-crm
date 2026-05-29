'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  MessageSquare, Send, Users, CheckCircle2, XCircle, Clock,
  RefreshCw, Loader2, ShieldAlert, Zap, Phone, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Contact {
  id: string
  full_name: string
  phone: string | null
}

interface SmsMessage {
  id: string
  contact_id: string | null
  phone: string
  message: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  created_at: string
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'delivered') return <CheckCircle2 className="size-3.5 text-emerald-500" />
  if (status === 'sent') return <CheckCircle2 className="size-3.5 text-blue-500" />
  if (status === 'failed') return <XCircle className="size-3.5 text-red-500" />
  return <Clock className="size-3.5 text-muted-foreground" />
}

export default function SmsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [messageText, setMessageText] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get company id
    const { data: uac } = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user.id).single()
    const cId = uac?.company_id
    setCompanyId(cId)

    // Check SMS integration
    if (cId) {
      const { data: intg } = await (supabase as any).from('integrations').select('sms_connected, fast2sms_api_key').eq('user_id', user.id).single()
      setSmsEnabled(!!intg?.sms_connected && !!intg?.fast2sms_api_key)
    }

    // Fetch contacts with phone numbers
    const { data: ctcts } = await supabase.from('contacts').select('id, full_name, phone').not('phone', 'is', null).is('deleted_at', null).order('full_name')
    if (ctcts) setContacts(ctcts as Contact[])

    // Fetch SMS history
    const { data: msgs } = await (supabase as any).from('sms_messages').select('*').order('created_at', { ascending: false }).limit(100)
    if (msgs) setMessages(msgs as SmsMessage[])

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const supabase = createClient()
    const ch = supabase.channel('sms-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [payload.new as SmsMessage, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as SmsMessage : m))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchData])

  const filtered = contacts.filter(c =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)
  )

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const handleSend = async () => {
    if (!messageText.trim()) { toast.error('Please enter a message'); return }
    if (selected.size === 0) { toast.error('Select at least one contact'); return }

    setSending(true)
    const targetContacts = contacts.filter(c => selected.has(c.id))
    let successCount = 0

    for (const contact of targetContacts) {
      if (!contact.phone) continue
      try {
        const res = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: contact.phone,
            message: messageText.trim(),
            contact_id: contact.id,
            company_id: companyId,
          }),
        })
        const data = await res.json()
        if (data.success) successCount++
      } catch (e) { /* continue */ }
    }

    toast.success(`SMS sent to ${successCount}/${targetContacts.length} contacts`)
    setMessageText('')
    setSelected(new Set())
    setSending(false)
    fetchData()
  }

  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.status === 'sent' || m.status === 'delivered').length,
    delivered: messages.filter(m => m.status === 'delivered').length,
    failed: messages.filter(m => m.status === 'failed').length,
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="Bulk SMS" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Bulk SMS Campaigns" subtitle="Send real-time SMS to leads via Fast2SMS — India's leading gateway" />
      <main className="flex-1 p-4 md:p-6 space-y-6">

        {/* Integration Warning */}
        {!smsEnabled && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30">
            <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Fast2SMS Not Connected</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                Go to <strong>Integrations → Bulk SMS</strong> and add your Fast2SMS API key to enable real SMS sending.
                Messages will be simulated (mock) until connected.
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-700" onClick={() => window.location.href = '/dashboard/integrations'}>
              Configure
            </Button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Sent', value: stats.total, icon: MessageSquare },
            { label: 'Successful', value: stats.sent, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Delivered', value: stats.delivered, icon: Zap, color: 'text-blue-600' },
            { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-500' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
                </div>
                <s.icon className={`size-5 ${s.color || 'text-muted-foreground'} opacity-70`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Contact Selector */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Select Recipients</p>
              <Badge variant="outline">{selected.size} selected</Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {filtered.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} id="select-all" />
                <label htmlFor="select-all" className="cursor-pointer text-muted-foreground text-xs">Select all ({filtered.length})</label>
              </div>
            )}

            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {contacts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10">
                  <Phone className="size-8 mx-auto mb-2 opacity-30" />
                  No contacts with phone numbers. Add contacts first.
                </div>
              ) : filtered.map(c => (
                <div key={c.id}
                  onClick={() => toggleOne(c.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(c.id) ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/30 border-border/50'}`}
                >
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} onClick={e => e.stopPropagation()} />
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                      {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compose Panel */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />Compose SMS
                </CardTitle>
                <CardDescription>Messages are sent via Fast2SMS. Max 160 characters for single SMS.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Message</Label>
                    <span className={`text-xs ${messageText.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {messageText.length}/160
                    </span>
                  </div>
                  <Textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Type your SMS message here…"
                    rows={5}
                    className="resize-none"
                  />
                </div>

                {/* Quick Templates */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quick Templates</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Hi! Following up on our conversation. Please call us at your convenience.',
                      'Your exclusive offer expires today! Reply YES to avail the deal.',
                      'Reminder: Your appointment is scheduled. Please confirm.',
                    ].map((t, i) => (
                      <button key={i} onClick={() => setMessageText(t)}
                        className="text-xs px-2 py-1 rounded border border-border/60 hover:bg-muted/40 transition-colors text-left">
                        Template {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending || selected.size === 0 || !messageText.trim()}
                  className="w-full gap-2"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {sending ? 'Sending…' : `Send to ${selected.size} Contact${selected.size !== 1 ? 's' : ''}`}
                </Button>
              </CardContent>
            </Card>

            {/* Message History */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recent Messages</CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="size-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <MessageSquare className="size-8 mx-auto mb-2 opacity-20" />
                    No messages sent yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {messages.slice(0, 30).map(m => {
                      const contact = contacts.find(c => c.id === m.contact_id)
                      return (
                        <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
                          <StatusIcon status={m.status} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold">{contact?.full_name || m.phone}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.message}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">{m.status}</Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
