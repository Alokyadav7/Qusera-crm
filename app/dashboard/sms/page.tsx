'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare, Send, CheckSquare, Square, Search,
  Phone, Loader2, AlertCircle, CheckCircle2, X,
  Smartphone, Clock
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Lead {
  id: string
  full_name: string
  phone_number: string | null
  company: string | null
  status: string
  buying_intent: string | null
}

const SMS_TEMPLATES = [
  { id: 't1', name: 'Follow-up', text: 'Hi {name}, following up on our discussion. Call us at your convenience. Reply STOP to opt out.' },
  { id: 't2', name: 'Offer Alert', text: 'Hi {name}, exclusive offer this week! Contact us to know more. Reply STOP to opt out.' },
  { id: 't3', name: 'Meeting Reminder', text: 'Hi {name}, reminder for your meeting today. Please confirm. Reply STOP to opt out.' },
  { id: 't4', name: 'Payment Reminder', text: 'Hi {name}, your payment is due. Please complete to avoid interruption. Reply STOP to opt out.' },
  { id: 't5', name: 'Welcome', text: 'Welcome {name}! We are excited to have you. Our team will reach out shortly. Reply STOP to opt out.' },
]

function getInitials(n: string) {
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function SMSPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [dltId, setDltId] = useState('')
  const [sending, setSending] = useState(false)
  const [logs, setLogs] = useState<{ id: string; text: string; count: number; ok: boolean; time: string }[]>([])
  const [company, setCompany] = useState('OrbitCRM')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('leads').select('id, full_name, phone_number, company, status, buying_intent')
      .not('phone_number', 'is', null).order('full_name')
      .then(({ data }) => { if (data) setLeads(data as Lead[]); setLoading(false) })
    supabase.from('profiles').select('company_name').single()
      .then(({ data }) => { if (data?.company_name) setCompany(data.company_name) })
  }, [])

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    return (!search || l.full_name.toLowerCase().includes(q) || (l.phone_number || '').includes(q))
      && (statusFilter === 'all' || l.status === statusFilter)
  })

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () =>
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)))

  const applyTemplate = (tid: string) => {
    const t = SMS_TEMPLATES.find(x => x.id === tid)
    if (t) setMessage(t.text.replace('{company}', company))
  }

  const handleSend = async () => {
    if (!message.trim()) { toast.error('Enter a message'); return }
    const sel = leads.filter(l => selectedIds.has(l.id) && l.phone_number)
    if (!sel.length) { toast.error('Select leads with phone numbers'); return }
    if (!window.confirm(`Send SMS to ${sel.length} leads?`)) return
    setSending(true)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, numbers: sel.map(l => l.phone_number!), leadIds: sel.map(l => l.id), templateId: dltId || undefined }),
      })
      const d = await res.json()
      const ok = !!d.success
      toast[ok ? 'success' : 'error'](d.message || d.error || 'Done')
      if (ok && d.mock) toast.info('Mock mode — add FAST2SMS_API_KEY to .env for real SMS')
      setLogs(prev => [{ id: Date.now().toString(), text: message.slice(0, 60), count: sel.length, ok, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 8))
      if (ok) setSelectedIds(new Set())
    } catch (e: any) { toast.error(e.message) }
    setSending(false)
  }

  const charsLeft = 160 - message.length
  const msgCredits = Math.ceil(message.length / 160) || 1

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Bulk SMS" subtitle={`${leads.length} leads with phone numbers · Powered by Fast2SMS`} />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* Lead List */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total with Phone', value: leads.length, color: 'text-primary' },
                { label: 'Selected', value: selectedIds.size, color: 'text-amber-600' },
                { label: 'SMS Sent', value: logs.filter(l => l.ok).reduce((s, l) => s + l.count, 0), color: 'text-emerald-600' },
              ].map(s => (
                <Card key={s.label}><CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent></Card>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search name, phone…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['all', 'new', 'contacted', 'interested', 'negotiation'].map(s => (
                    <SelectItem key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 px-1">
              <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                {selectedIds.size === filtered.length && filtered.length > 0
                  ? <CheckSquare className="size-4 text-primary" /> : <Square className="size-4" />}
                {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : `Select All (${filtered.length})`}
              </button>
              {selectedIds.size > 0 && <Badge variant="secondary">{selectedIds.size} selected</Badge>}
            </div>

            <Card>
              <CardContent className="p-0 divide-y max-h-[440px] overflow-y-auto">
                {loading && <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
                {!loading && filtered.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <Phone className="size-8 mx-auto mb-2 opacity-30" />No leads with phone found
                  </div>
                )}
                {!loading && filtered.map(lead => (
                  <div key={lead.id} onClick={() => toggleSelect(lead.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${selectedIds.has(lead.id) ? 'bg-primary/5' : ''}`}>
                    {selectedIds.has(lead.id) ? <CheckSquare className="size-5 text-primary shrink-0" /> : <Square className="size-5 text-muted-foreground shrink-0" />}
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{getInitials(lead.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="size-3" />{lead.phone_number}
                        {lead.company && <span>· {lead.company}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">{lead.status}</Badge>
                      {lead.buying_intent === 'high' && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Hot</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Compose */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="size-5 text-primary" />Compose SMS
                </CardTitle>
                <CardDescription>160 chars = 1 SMS credit per recipient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Template</Label>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger><SelectValue placeholder="Pick a template…" /></SelectTrigger>
                    <SelectContent>
                      {SMS_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Message <span className="text-destructive">*</span></Label>
                  <Textarea rows={5} placeholder="Type SMS… use {name} to personalise"
                    value={message} onChange={e => setMessage(e.target.value.slice(0, 480))} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className={charsLeft < 0 ? 'text-destructive' : ''}>{charsLeft < 0 ? `${Math.abs(charsLeft)} over` : `${charsLeft} left`}</span>
                    <span>{msgCredits} credit{msgCredits !== 1 ? 's' : ''} / recipient</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>DLT Template ID <span className="text-xs text-muted-foreground">(India TRAI)</span></Label>
                  <Input placeholder="1107161234567890" value={dltId} onChange={e => setDltId(e.target.value)} />
                </div>
                {message && (
                  <div className="bg-muted/50 rounded-xl p-3 border">
                    <p className="text-xs text-muted-foreground mb-2">Preview</p>
                    <div className="bg-green-500 text-white rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-[90%]">
                      {message.replace('{name}', 'Rajesh').replace('{company}', company)}
                    </div>
                  </div>
                )}
                <Button className="w-full" onClick={handleSend}
                  disabled={sending || selectedIds.size === 0 || !message.trim()}>
                  {sending ? <><Loader2 className="size-4 mr-2 animate-spin" />Sending…</> : <><Send className="size-4 mr-2" />Send to {selectedIds.size} Lead{selectedIds.size !== 1 ? 's' : ''}</>}
                </Button>
                {selectedIds.size === 0 && <p className="text-xs text-center text-amber-600 flex items-center justify-center gap-1"><AlertCircle className="size-3" />Select leads on the left</p>}
              </CardContent>
            </Card>

            {logs.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="size-4" />Recent Sends</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {logs.map(l => (
                    <div key={l.id} className="flex items-start gap-2 text-xs">
                      {l.ok ? <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" /> : <X className="size-4 text-red-500 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{l.count} leads · {l.time}</p>
                        <p className="text-muted-foreground truncate">{l.text}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-dashed">
              <CardContent className="p-4 space-y-1.5">
                <p className="text-xs font-semibold flex items-center gap-1.5"><AlertCircle className="size-3.5 text-amber-500" />Setup for real SMS</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Sign up free at <strong>fast2sms.com</strong></li>
                  <li>Add <code className="bg-muted px-1 rounded">FAST2SMS_API_KEY</code> to .env</li>
                  <li>Register DLT templates (TRAI India)</li>
                  <li>Paste DLT Template ID above</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
