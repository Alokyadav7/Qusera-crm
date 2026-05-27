'use client'

import { useState, useEffect, useCallback } from 'react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell, CheckCheck, Trash2, UserPlus, CheckSquare, MessageSquare,
  AlertCircle, Zap, Clock, TrendingUp, RefreshCw, BellOff, Database, Copy
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────
type NotificationType =
  | 'lead_assigned' | 'task_created' | 'task_due' | 'whatsapp_reply'
  | 'missed_followup' | 'status_change' | 'ai_alert' | 'mention'
  | 'automation' | 'lead_hot' | 'compliance_alert'

interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  is_read: boolean
  lead_id: string | null
  task_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  lead_assigned:    { icon: UserPlus,      label: 'Lead Assigned'    },
  task_created:     { icon: CheckSquare,   label: 'Task Created'     },
  task_due:         { icon: Clock,         label: 'Task Due'         },
  whatsapp_reply:   { icon: MessageSquare, label: 'WhatsApp Reply'   },
  missed_followup:  { icon: AlertCircle,   label: 'Missed Follow-up' },
  status_change:    { icon: TrendingUp,    label: 'Status Changed'   },
  ai_alert:         { icon: Zap,           label: 'AI Alert'         },
  mention:          { icon: Bell,          label: 'Mention'          },
  automation:       { icon: Zap,           label: 'Automation'       },
  lead_hot:         { icon: TrendingUp,    label: 'Hot Lead'         },
  compliance_alert: { icon: AlertCircle,   label: 'Compliance'       },
}

const FILTER_OPTIONS = [
  { value: 'all',             label: 'All'       },
  { value: 'unread',          label: 'Unread'    },
  { value: 'lead_hot',        label: 'Hot Leads' },
  { value: 'whatsapp_reply',  label: 'WhatsApp'  },
  { value: 'task_due',        label: 'Tasks'     },
  { value: 'ai_alert',        label: 'AI Alerts' },
]

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Setup screen shown when table doesn't exist ───────────────────────────────
const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL,
  title        text NOT NULL,
  message      text,
  is_read      boolean DEFAULT false,
  lead_id      uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  task_id      uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`

function SetupScreen() {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(MIGRATION_SQL)
    setCopied(true)
    toast.success('SQL copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="size-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mx-auto">
          <Database className="size-7 text-muted-foreground/50" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Notifications table not set up</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run the SQL below in your Supabase SQL editor to enable real-time notifications.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border">
        {[
          { n: '1', text: 'Open your Supabase project dashboard' },
          { n: '2', text: 'Go to SQL Editor in the left sidebar' },
          { n: '3', text: 'Paste the SQL below and click Run' },
          { n: '4', text: 'Refresh this page — notifications will appear here' },
        ].map(s => (
          <div key={s.n} className="flex items-center gap-3 p-4">
            <div className="size-6 rounded-full border border-border text-xs font-bold flex items-center justify-center text-muted-foreground shrink-0">
              {s.n}
            </div>
            <p className="text-sm">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-mono text-muted-foreground">migration.sql</span>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5">
            <Copy className="size-3" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {MIGRATION_SQL}
        </pre>
      </div>
    </div>
  )
}

// ── Notification Row ──────────────────────────────────────────────────────────
function NotificationRow({
  notif, onRead, onDelete,
}: {
  notif: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const config = TYPE_CONFIG[notif.type] ?? { icon: Bell, label: notif.type }
  const Icon = config.icon
  return (
    <div className={`flex items-start gap-3 p-4 border-b last:border-b-0 transition-colors hover:bg-muted/30 ${!notif.is_read ? 'bg-muted/20' : ''}`}>
      <div className="relative shrink-0 mt-0.5">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        {!notif.is_read && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold' : 'font-medium'}`}>
            {notif.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {timeSince(notif.created_at)}
          </span>
        </div>
        {notif.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">{config.label}</Badge>
          {!notif.is_read && (
            <button onClick={() => onRead(notif.id)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Mark read
            </button>
          )}
          <button onClick={() => onDelete(notif.id)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto">
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]       = useState(true)
  const [tableReady, setTableReady] = useState(true)   // assume ready; set false on 42P01 error
  const [filter, setFilter]         = useState('all')
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        // 42P01 = table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableReady(false)
        }
      } else if (data) {
        setTableReady(true)
        setNotifications(data as Notification[])
      }
    } catch {
      // network error — ignore silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    if (!tableReady) return   // don't subscribe if table missing

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNotifications])

  const handleRead = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(p => p.filter(n => n.id !== id))
  }, [])

  const markAllRead = useCallback(async () => {
    setMarkingAll(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMarkingAll(false); return }
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false)
    setNotifications(p => p.map(n => ({ ...n, is_read: true })))
    toast.success('All notifications marked as read')
    setMarkingAll(false)
  }, [])

  const filtered = notifications.filter(n => {
    if (filter === 'all')    return true
    if (filter === 'unread') return !n.is_read
    return n.type === filter
  })
  const unreadCount = notifications.filter(n => !n.is_read).length

  // ── Render ────────────────────────────────────────────────────────────────
  if (!loading && !tableReady) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="Notifications" subtitle="Setup required" />
        <main className="flex-1 p-6"><SetupScreen /></main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Notifications"
        subtitle={loading ? 'Loading…' : unreadCount > 0
          ? `${unreadCount} unread · ${notifications.length} total`
          : `${notifications.length} notifications`}
      />

      <main className="flex-1 p-4 md:p-6 space-y-4 max-w-3xl mx-auto w-full">
        {/* Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/20">
            {FILTER_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === opt.value
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {opt.label}
                {opt.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchNotifications}>
              <RefreshCw className="size-4 mr-1.5" />Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} disabled={markingAll}>
                <CheckCheck className="size-4 mr-1.5" />Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <Card>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BellOff className="size-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-sm">
                {filter === 'all' ? 'No notifications yet' : `No ${FILTER_OPTIONS.find(f => f.value === filter)?.label?.toLowerCase()} notifications`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {filter === 'all'
                  ? 'Notifications appear here when leads are assigned, tasks are due, or AI detects signals.'
                  : 'Try a different filter.'}
              </p>
              {filter !== 'all' && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setFilter('all')}>
                  View all
                </Button>
              )}
            </CardContent>
          ) : (
            filtered.map(n => (
              <NotificationRow key={n.id} notif={n} onRead={handleRead} onDelete={handleDelete} />
            ))
          )}
        </Card>
      </main>
    </div>
  )
}
