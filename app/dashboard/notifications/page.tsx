'use client'

import { useState, useEffect, useCallback } from 'react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell, BellOff, CheckCheck, Mic, MessageSquare, Phone,
  TrendingUp, Calendar, AlertTriangle, Info, Star,
  Bot, Trophy, Clock, ArrowRight, Trash2, Check, Loader2, RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'
import { toast } from 'sonner'

type NotifType = 'ai' | 'task' | 'lead' | 'call' | 'whatsapp' | 'system'
type NotifPriority = 'urgent' | 'high' | 'medium' | 'low'

interface Notification {
  id: string
  type: NotifType
  priority: NotifPriority
  title: string
  body: string
  time: Date
  read: boolean
  actionLabel?: string
  actionHref?: string
}

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; color: string; bg: string }> = {
  ai:       { icon: <Bot className="size-4" />,    color: 'text-violet-600', bg: 'bg-violet-50' },
  task:     { icon: <Calendar className="size-4" />,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  lead:     { icon: <Star className="size-4" />,        color: 'text-amber-600',  bg: 'bg-amber-50' },
  call:     { icon: <Phone className="size-4" />,       color: 'text-green-600',  bg: 'bg-green-50' },
  whatsapp: { icon: <MessageSquare className="size-4" />,color: 'text-emerald-600',bg: 'bg-emerald-50' },
  system:   { icon: <Info className="size-4" />,        color: 'text-slate-600',  bg: 'bg-slate-50' },
}

const PRIORITY_BADGE: Record<NotifPriority, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low:    'bg-slate-100 text-slate-600 border-slate-200',
}

export default function NotificationsPage() {
  const [dbNotifs, setDbNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { leads } = useRealtimeLeads()
  const { interactions } = useRealtimeInteractions()

  // ── Build live notifications from DB + interactions ──────────────────
  const buildNotifications = useCallback((): Notification[] => {
    const now = Date.now()
    const generated: Notification[] = []

    // Hot leads (high buying_intent + recent)
    const hotLeads = leads.filter(l => l.buying_intent === 'high')
    hotLeads.slice(0, 3).forEach(lead => {
      generated.push({
        id: `hot-${lead.id}`,
        type: 'ai',
        priority: 'urgent',
        title: `🔥 ${lead.full_name} has high buying intent`,
        body: `AI score: ${Math.round((lead.sentiment_score + 1) * 50)}%. Contact now before competitor does.`,
        time: new Date(lead.updated_at || lead.created_at),
        read: false,
        actionLabel: 'View Lead',
        actionHref: '/dashboard/leads',
      })
    })

    // Recent inbound WhatsApp messages
    const inboundWA = interactions
      .filter(i => i.type === 'whatsapp' && i.direction === 'inbound')
      .slice(0, 3)
    inboundWA.forEach(msg => {
      const lead = leads.find(l => l.id === msg.lead_id)
      generated.push({
        id: `wa-${msg.id}`,
        type: 'whatsapp',
        priority: 'high',
        title: `New WhatsApp from ${lead?.full_name || 'Unknown'}`,
        body: msg.content_raw?.slice(0, 100) || 'New message received',
        time: new Date(msg.created_at),
        read: false,
        actionLabel: 'Reply',
        actionHref: '/dashboard/whatsapp',
      })
    })

    // New leads added today
    const todayLeads = leads.filter(l => {
      const created = new Date(l.created_at)
      return new Date().toDateString() === created.toDateString()
    })
    if (todayLeads.length > 0) {
      generated.push({
        id: `new-leads-today`,
        type: 'lead',
        priority: 'medium',
        title: `${todayLeads.length} new lead${todayLeads.length > 1 ? 's' : ''} added today`,
        body: todayLeads.map(l => l.full_name).slice(0, 3).join(', ') + (todayLeads.length > 3 ? '…' : ''),
        time: new Date(todayLeads[0].created_at),
        read: false,
        actionLabel: 'View Leads',
        actionHref: '/dashboard/leads',
      })
    }

    // Won deals
    const wonLeads = leads.filter(l => l.status === 'closed_won')
    wonLeads.slice(0, 2).forEach(lead => {
      generated.push({
        id: `won-${lead.id}`,
        type: 'ai',
        priority: 'high',
        title: `🏆 Deal Won: ${lead.full_name}`,
        body: `₹${((lead.deal_value || lead.estimated_budget || 0) / 100000).toFixed(1)}L closed. Great work!`,
        time: new Date(lead.updated_at || lead.created_at),
        read: true,
        actionLabel: 'View Pipeline',
        actionHref: '/dashboard/pipeline',
      })
    })

    // DB notifications merged
    return [...generated, ...dbNotifs]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
  }, [leads, interactions, dbNotifs])

  // ── Load DB notifications ─────────────────────────────────────────────
  const loadDbNotifs = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      setDbNotifs(data.map(n => ({
        id: n.id,
        type: (n.type || 'system') as NotifType,
        priority: (n.priority || 'medium') as NotifPriority,
        title: n.title,
        body: n.body || '',
        time: new Date(n.created_at),
        read: n.is_read,
        actionLabel: n.action_label,
        actionHref: n.action_href,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadDbNotifs() }, [loadDbNotifs])

  const allNotifs = buildNotifications()
  const unread = allNotifs.filter(n => !n.read)

  const markAllRead = useCallback(async () => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    toast.success('All notifications marked as read')
    loadDbNotifs()
  }, [loadDbNotifs])

  const deleteNotif = useCallback(async (id: string) => {
    if (!id.startsWith('hot-') && !id.startsWith('wa-') && !id.startsWith('new-') && !id.startsWith('won-')) {
      const supabase = createClient()
      await supabase.from('notifications').delete().eq('id', id)
      loadDbNotifs()
    }
    toast.success('Notification dismissed')
  }, [loadDbNotifs])

  function NotifCard({ notif }: { notif: Notification }) {
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
    return (
      <div className={`flex gap-4 p-4 rounded-xl border transition-all ${notif.read ? 'bg-background opacity-70' : 'bg-card shadow-sm'}`}>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${cfg.bg} ${cfg.color}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-semibold leading-tight ${notif.read ? 'text-muted-foreground' : ''}`}>{notif.title}</p>
              {!notif.read && <span className="size-2 rounded-full bg-primary shrink-0 mt-0.5" />}
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 ${PRIORITY_BADGE[notif.priority]}`}>{notif.priority}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.body}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />{formatDistanceToNow(notif.time, { addSuffix: true })}
            </span>
            {notif.actionLabel && notif.actionHref && (
              <a href={notif.actionHref} className="text-xs text-primary hover:underline flex items-center gap-1">
                {notif.actionLabel} <ArrowRight className="size-3" />
              </a>
            )}
            <button onClick={() => deleteNotif(notif.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Notifications"
        subtitle={`${unread.length} unread · Generated from live Supabase data`}
      />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />Live
            </Badge>
            {unread.length > 0 && (
              <Badge className="bg-red-500 text-white">{unread.length} unread</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadDbNotifs}>
              <RefreshCw className="size-4 mr-2" />Refresh
            </Button>
            {unread.length > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="size-4 mr-2" />Mark All Read
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All ({allNotifs.length})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
              <TabsTrigger value="ai">AI Insights ({allNotifs.filter(n => n.type === 'ai').length})</TabsTrigger>
              <TabsTrigger value="leads">Leads ({allNotifs.filter(n => n.type === 'lead').length})</TabsTrigger>
            </TabsList>

            {['all','unread','ai','leads'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {(tab === 'all' ? allNotifs :
                  tab === 'unread' ? unread :
                  tab === 'ai' ? allNotifs.filter(n => n.type === 'ai') :
                  allNotifs.filter(n => n.type === 'lead')
                ).length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <BellOff className="size-12 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No notifications yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add leads and interactions to generate real-time alerts</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {(tab === 'all' ? allNotifs :
                      tab === 'unread' ? unread :
                      tab === 'ai' ? allNotifs.filter(n => n.type === 'ai') :
                      allNotifs.filter(n => n.type === 'lead')
                    ).map(notif => <NotifCard key={notif.id} notif={notif} />)}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  )
}
