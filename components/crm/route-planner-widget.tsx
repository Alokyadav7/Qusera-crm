'use client'

import { useEffect, useState } from 'react'
import { MapPin, Navigation, Route, Clock, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isToday, format } from 'date-fns'

interface RouteTask {
  id: string
  title: string
  due_date: string
  priority: string
  location_address: string | null
  lead?: { full_name: string } | null
}

function getPriorityDot(priority: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-400',
  }
  return map[priority] || 'bg-slate-400'
}

export function RoutePlannerWidget() {
  const [stops, setStops] = useState<RouteTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tasks')
      .select('id, title, due_date, priority, location_address, lead:leads(full_name)')
      .eq('is_completed', false)
      .order('due_date', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          // Show tasks that have a location AND are today, or site_visit type
          const todayStops = (data as unknown as RouteTask[]).filter(
            t => t.location_address && isToday(new Date(t.due_date))
          )
          setStops(todayStops.slice(0, 4))
        }
        setLoading(false)
      })
  }, [])

  return (
    <Card className="glass-card flex flex-col h-full card-hover border-border/50 shadow-sm shadow-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="size-5 text-primary" />
          {"Today's Route"}
          {stops.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-1">{stops.length} stop{stops.length !== 1 ? 's' : ''}</Badge>
          )}
        </CardTitle>
        <CardDescription>Field visits scheduled today</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/routes">Plan Route</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 flex items-center justify-center">
            <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MapPin className="size-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No field visits today</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add tasks with a location address to see them here</p>
            <Button className="mt-3" size="sm" asChild>
              <Link href="/dashboard/routes">
                <Navigation className="size-4 mr-2" />Plan Route
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {stops.map((stop, i) => (
              <div key={stop.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">{i + 1}</span>
                  {i < stops.length - 1 && <div className="w-px h-3 bg-border" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full shrink-0 ${getPriorityDot(stop.priority)}`} />
                    <p className="text-sm font-medium truncate">{stop.title}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{stop.location_address}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />{format(new Date(stop.due_date), 'h:mm a')}
                    </span>
                    {stop.lead && <span>👤 {stop.lead.full_name}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon" className="size-7 shrink-0"
                  onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(stop.location_address || '')}`)}
                  title="Open in Google Maps"
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-1" size="sm" asChild>
              <Link href="/dashboard/routes">
                <Navigation className="size-4 mr-2" />Open Full Route Planner
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
