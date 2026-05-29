'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotifications, type CRMNotification } from '@/lib/hooks/use-notifications'
import { CRMHeader } from '@/components/crm/crm-header'
import {
  Bell, BellOff, CheckCheck, User, Zap,
  MessageCircle, Activity, RefreshCw, ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

function entityIcon(entityType: string | null) {
  switch (entityType) {
    case 'lead': return User
    case 'task': return Zap
    case 'message': return MessageCircle
    case 'deal': return Activity
    default: return Bell
  }
}

function entityColor(entityType: string | null) {
  switch (entityType) {
    case 'lead': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'task': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    case 'message': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'deal': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
    default: return 'bg-muted text-muted-foreground'
  }
}

function entityHref(n: CRMNotification) {
  if (n.entity_type === 'lead') return '/dashboard/leads'
  if (n.entity_type === 'task') return '/dashboard/tasks'
  if (n.entity_type === 'deal') return '/dashboard/pipeline'
  if (n.entity_type === 'message') return '/dashboard/whatsapp'
  return '/dashboard/notifications'
}

export default function NotificationsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      ;(supabase as any).from('user_active_company')
        .select('company_id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }: { data: any }) => setCompanyId(data?.company_id ?? null))
    })
  }, [])

  const { notifications, unread, loading, markAllRead, markRead, refresh } = useNotifications(companyId)
  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Notifications" subtitle="Real-time activity feed for your workspace" />

      <main className="flex-1 p-4 md:p-6 max-w-[800px] mx-auto w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filter === f
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
                <CheckCheck className="size-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center">
              <BellOff className="size-7 opacity-50" />
            </div>
            <p className="font-medium">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm text-center max-w-xs">
              {filter === 'unread'
                ? 'All caught up! Switch to "All" to see past activity.'
                : 'Activity from your team and leads will appear here in real-time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayed.map(notif => {
              const Icon = entityIcon(notif.entity_type)
              const iconColor = entityColor(notif.entity_type)
              return (
                <button
                  key={notif.id}
                  id={`notification-${notif.id}`}
                  onClick={() => { markRead(notif.id); router.push(entityHref(notif)) }}
                  className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all hover:border-border ${
                    notif.read
                      ? 'border-border/30 bg-card opacity-60 hover:opacity-80'
                      : 'border-border/50 bg-card shadow-sm'
                  }`}
                >
                  {!notif.read && (
                    <div className="size-2 rounded-full bg-primary mt-2.5 shrink-0" />
                  )}
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor} ${notif.read ? 'opacity-60' : ''}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{notif.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        <ExternalLink className="size-2.5 opacity-40" />
                      </span>
                    </div>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
                    )}
                    {notif.entity_type && (
                      <span className="text-[10px] text-muted-foreground/60 mt-1 capitalize">
                        {notif.entity_type}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
