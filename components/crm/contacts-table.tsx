'use client'

import { useState } from 'react'
import { Search, Flame, Thermometer, Snowflake, Mail, Phone, BarChart2, RefreshCw, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Lead } from '@/hooks/use-realtime-leads'

const STATUS_TAGS: Record<string, { label: string; icon: typeof Flame; className: string; bar: string }> = {
  high:   { label:'Hot',  icon:Flame,       className:'bg-foreground text-background',    bar:'bg-foreground' },
  medium: { label:'Warm', icon:Thermometer, className:'bg-foreground/10 text-foreground', bar:'bg-foreground/60' },
  low:    { label:'Cold', icon:Snowflake,   className:'bg-transparent border border-foreground/20 text-foreground/70',  bar:'bg-foreground/30' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function getAvatarColor(name: string) {
  const colors = ['bg-zinc-800','bg-zinc-700','bg-zinc-900','bg-neutral-800','bg-stone-800']
  return colors[name.charCodeAt(0) % colors.length]
}
function formatValue(v: number | null | undefined) {
  if (!v) return '—'
  return v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}K`
}
function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days/7)}w ago`
}

function getDisplayScore(score: number): number {
  if (score > 1) return Math.round(score)
  return Math.round(((score + 1) / 2) * 100)
}

interface ContactsTableProps {
  leads: Lead[]
  isLoading: boolean
  onRefresh: () => void
  onAIAction?: (prompt: string, context: string) => void
}

export function ContactsTable({ leads, isLoading, onRefresh, onAIAction }: ContactsTableProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'high'|'medium'|'low'>('all')

  const filtered = leads.filter(c => {
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone_number || '').includes(search)
    const matchesFilter = filter === 'all' || c.buying_intent === filter
    return matchesSearch && matchesFilter
  })

  function triggerAI(lead: Lead, action: string) {
    const scoreVal = getDisplayScore(lead.sentiment_score)
    const ctx = `Contact: ${lead.full_name} | Company: ${lead.company || 'N/A'} | Score: ${scoreVal}/100 | Intent: ${lead.buying_intent} | Deal Value: ${formatValue(lead.deal_value || lead.estimated_budget)} | Status: ${lead.status} | Source: ${lead.source || 'N/A'}`
    const prompts: Record<string, string> = {
      email: `Draft a personalized follow-up email for ${lead.full_name} at ${lead.company || 'their company'}. Deal value: ${formatValue(lead.deal_value || lead.estimated_budget)}. Their current status is ${lead.status}.`,
      call: `Give me a 30-second call opener for ${lead.full_name} at ${lead.company || 'their company'}. Sentiment score: ${scoreVal}/100, buying intent: ${lead.buying_intent}.`,
      score: `Analyze the lead score of ${scoreVal}/100 for ${lead.full_name} at ${lead.company || 'their company'} with ${lead.buying_intent} buying intent. Provide 3 specific actions to improve conversion.`,
    }
    onAIAction?.(prompts[action], ctx)
  }

  return (
    <Card className="glass-ultra flex flex-col h-full border-border/50 shadow-sm shadow-foreground/5">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Contacts
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {leads.length} live
              </span>
            </CardTitle>
            <CardDescription>Real-time from Supabase · Click AI buttons for insights</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon" className="size-8" onClick={onRefresh} title="Refresh">
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {(['all','high','medium','low'] as const).map(f => (
              <Button key={f} variant={filter===f?'default':'outline'} size="sm"
                className="h-7 text-xs" onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'high' ? '🔥 Hot' : f === 'medium' ? '🌡 Warm' : '❄️ Cold'}
              </Button>
            ))}
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search contacts, company, phone…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading live data…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Contact</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Score</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Intent</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Value</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Last Contact</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">AI Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const cfg = STATUS_TAGS[c.buying_intent] || STATUS_TAGS.low
                  const StatusIcon = cfg.icon
                  const displayScoreVal = getDisplayScore(c.sentiment_score)
                  return (
                    <tr key={c.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i%2===0?'':'bg-muted/10'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback className={`${getAvatarColor(c.full_name)} text-white text-xs font-semibold`}>
                              {getInitials(c.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.company || c.city || 'No company'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${cfg.bar} transition-all`}
                              style={{ width:`${Math.min(100, displayScoreVal)}%` }} />
                          </div>
                          <span className="text-xs font-medium w-7 text-right">{displayScoreVal}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={`gap-1 text-xs font-medium ${cfg.className} border-0`}>
                          <StatusIcon className="size-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="font-medium text-foreground">
                          {formatValue(c.deal_value || c.estimated_budget)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {timeAgo(c.last_contacted_at || c.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7 hover:text-foreground hover:bg-foreground/10 transition-colors"
                            title="Draft Email" onClick={() => triggerAI(c, 'email')}>
                            <Mail className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 hover:text-foreground hover:bg-foreground/10 transition-colors"
                            title="Call Opener" onClick={() => triggerAI(c, 'call')}>
                            <Phone className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 hover:text-foreground hover:bg-foreground/10 transition-colors"
                            title="AI Score Analysis" onClick={() => triggerAI(c, 'score')}>
                            <BarChart2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {leads.length === 0 ? 'No contacts in database yet — add your first lead!' : 'No contacts match your filter'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
