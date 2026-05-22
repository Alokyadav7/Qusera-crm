'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Mic, MessageSquare, Phone, Mail, Image, Filter, Search,
  ArrowUpRight, ArrowDownLeft, Play, Pause, Bot, Loader2,
  RefreshCw, Plus, X
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Interaction {
  id: string
  type: string
  direction: string
  content_raw: string | null
  content_transcribed: string | null
  sentiment_score: number | null
  ai_extracted_data: Record<string, unknown> | null
  created_at: string
  lead_id: string | null
  lead?: { id: string; full_name: string; company: string | null } | null
}

function getInteractionIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    voice: <Mic className="size-4" />,
    whatsapp: <MessageSquare className="size-4" />,
    call: <Phone className="size-4" />,
    email: <Mail className="size-4" />,
    image: <Image className="size-4" />,
  }
  return map[type] || <MessageSquare className="size-4" />
}

function getIconBg(type: string): string {
  const map: Record<string, string> = {
    voice: 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
    whatsapp: 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400',
    call: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    email: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    image: 'bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400',
  }
  return map[type] || 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
}

function getSentimentLabel(score: number): string {
  if (score >= 0.6) return 'Very Positive'
  if (score >= 0.3) return 'Positive'
  if (score >= -0.3) return 'Neutral'
  if (score >= -0.6) return 'Negative'
  return 'Very Negative'
}

function getSentimentColor(score: number): string {
  if (score >= 0.6) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30'
  if (score >= 0.3) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30'
  if (score >= -0.3) return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
  if (score >= -0.6) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30'
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/30'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [leads, setLeads] = useState<{ id: string; full_name: string }[]>([])
  const [logForm, setLogForm] = useState({ lead_id: '', type: 'call', direction: 'outbound', content: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchInteractions = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('interactions')
      .select('*, lead:leads(id, full_name, company)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setInteractions(data as Interaction[])
    setLoading(false)
  }, [])

  const fetchLeads = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('leads').select('id, full_name').order('full_name').limit(100)
    if (data) setLeads(data)
  }, [])

  useEffect(() => {
    fetchInteractions()
    fetchLeads()
    const supabase = createClient()
    const channel = supabase
      .channel('realtime-interactions-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' }, fetchInteractions)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchInteractions, fetchLeads])

  // ── Log interaction manually ───────────────────────────────────────────────
  const handleLog = async () => {
    if (!logForm.content.trim()) { toast.error('Content is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('interactions').insert({
      user_id: user.id,
      lead_id: logForm.lead_id || null,
      type: logForm.type,
      direction: logForm.direction,
      content_raw: logForm.content,
      sentiment_score: null,
      created_at: new Date().toISOString(),
    })
    if (error) { toast.error(error.message) }
    else {
      toast.success('Interaction logged! ✅')
      setLogForm({ lead_id: '', type: 'call', direction: 'outbound', content: '', notes: '' })
      setIsLogOpen(false)
    }
    setSaving(false)
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = interactions.filter(i => {
    const name = i.lead?.full_name?.toLowerCase() || ''
    const company = i.lead?.company?.toLowerCase() || ''
    const content = (i.content_raw || i.content_transcribed || '').toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || company.includes(search.toLowerCase()) || content.includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || i.type === typeFilter
    const matchDir = directionFilter === 'all' || i.direction === directionFilter
    const matchSentiment = sentimentFilter === 'all' ||
      (sentimentFilter === 'positive' && (i.sentiment_score || 0) >= 0.3) ||
      (sentimentFilter === 'neutral' && Math.abs(i.sentiment_score || 0) < 0.3) ||
      (sentimentFilter === 'negative' && (i.sentiment_score || 0) < -0.3)
    return matchSearch && matchType && matchDir && matchSentiment
  })

  const hasFilters = search || typeFilter !== 'all' || sentimentFilter !== 'all' || directionFilter !== 'all'

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Interactions"
        subtitle={loading ? 'Loading…' : `${interactions.length} total · ${filtered.length} shown · Real-time`}
      />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, company, content…"
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchInteractions}>
                <RefreshCw className="size-4 mr-1" />Refresh
              </Button>
              <Button size="sm" onClick={() => setIsLogOpen(true)}>
                <Plus className="size-4 mr-1" />Log Interaction
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/dashboard/voice">
                  <Mic className="size-4 mr-1" />Voice Note
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="voice">Voice Notes</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs"
                onClick={() => { setSearch(''); setTypeFilter('all'); setSentimentFilter('all'); setDirectionFilter('all') }}>
                <X className="size-3 mr-1" />Clear
              </Button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
            <MessageSquare className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {hasFilters ? 'No results match your filters' : 'No interactions yet'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              {hasFilters
                ? 'Try clearing filters or a different search term'
                : 'Log calls, send WhatsApp messages, or record voice notes to track communications'}
            </p>
            <div className="flex gap-2">
              {hasFilters && (
                <Button variant="outline" size="sm"
                  onClick={() => { setSearch(''); setTypeFilter('all'); setSentimentFilter('all'); setDirectionFilter('all') }}>
                  Clear Filters
                </Button>
              )}
              <Button size="sm" onClick={() => setIsLogOpen(true)}>
                <Plus className="size-4 mr-1" />Log Interaction
              </Button>
            </div>
          </div>
        )}

        {/* Interaction List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(interaction => {
              const leadName = interaction.lead?.full_name || 'Unknown Lead'
              const leadCompany = interaction.lead?.company
              return (
                <Card key={interaction.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-4 p-4">
                      <div className="relative shrink-0">
                        <Avatar className="size-11">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(leadName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full ${getIconBg(interaction.type)}`}>
                          {getInteractionIcon(interaction.type)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm">{leadName}</span>
                          <span className={`flex size-5 items-center justify-center rounded-full ${interaction.direction === 'inbound' ? 'bg-blue-100 dark:bg-blue-950/40' : 'bg-emerald-100 dark:bg-emerald-950/40'}`}>
                            {interaction.direction === 'inbound'
                              ? <ArrowDownLeft className="size-3 text-blue-600 dark:text-blue-400" />
                              : <ArrowUpRight className="size-3 text-emerald-600 dark:text-emerald-400" />
                            }
                          </span>
                          {leadCompany && <span className="text-xs text-muted-foreground">· {leadCompany}</span>}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="capitalize text-xs">{interaction.type}</Badge>
                          <Badge variant="secondary" className="text-xs">{interaction.direction}</Badge>
                          {interaction.sentiment_score !== null && (
                            <Badge variant="outline" className={`text-xs ${getSentimentColor(interaction.sentiment_score)}`}>
                              {getSentimentLabel(interaction.sentiment_score)}
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        {(interaction.content_raw || interaction.content_transcribed) && (
                          <div className="bg-muted/50 rounded-lg p-2.5 mb-2">
                            <p className="text-sm text-foreground line-clamp-2">
                              {interaction.content_transcribed || interaction.content_raw}
                            </p>
                          </div>
                        )}

                        {/* AI Data */}
                        {interaction.ai_extracted_data && Object.keys(interaction.ai_extracted_data).length > 0 && (
                          <div className="border rounded-lg p-2.5 bg-primary/5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Bot className="size-3.5 text-primary" />
                              <span className="text-xs font-medium text-primary">AI Insights</span>
                            </div>
                            <div className="space-y-1">
                              {(() => {
                                const nextAction = interaction.ai_extracted_data?.nextAction
                                const summary = interaction.ai_extracted_data?.summary
                                return (
                                  <>
                                    {nextAction != null && (
                                      <p className="text-xs"><span className="text-muted-foreground">Action: </span>{String(nextAction)}</p>
                                    )}
                                    {summary != null && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{String(summary)}</p>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Log Interaction Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />Log Interaction
            </DialogTitle>
            <DialogDescription>Manually record a call, email, or message with a lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={logForm.lead_id}
                onChange={e => setLogForm(p => ({ ...p, lead_id: e.target.value }))}
              >
                <option value="">— No lead (general) —</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={logForm.type} onChange={e => setLogForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="call">📞 Call</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="email">✉️ Email</option>
                  <option value="voice">🎙️ Voice</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={logForm.direction} onChange={e => setLogForm(p => ({ ...p, direction: e.target.value }))}>
                  <option value="outbound">↗ Outbound</option>
                  <option value="inbound">↙ Inbound</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Content / Notes <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="What was discussed? Any key points, outcomes, next steps…"
                rows={3}
                value={logForm.content}
                onChange={e => setLogForm(p => ({ ...p, content: e.target.value }))}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogOpen(false)}>Cancel</Button>
            <Button onClick={handleLog} disabled={saving || !logForm.content.trim()}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
              Log It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
