'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  MapPin, Phone, CheckCircle2, RefreshCw, Navigation,
  Loader2, MessageSquare, ArrowUp, ArrowDown, Share2, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type LeadWithCity = {
  id: string
  full_name: string
  phone_number: string | null
  company: string | null
  city: string | null
  state: string | null
  address: string | null
  last_contacted_at: string | null
  status: string
  buying_intent: string
}

export default function RoutesPage() {
  const { leads, isLoading, refetch } = useRealtimeLeads()
  const [cityFilter, setCityFilter] = useState('all')
  const [visitOrder, setVisitOrder] = useState<string[]>([])
  const [visited, setVisited] = useState<Set<string>>(new Set())
  const [marking, setMarking] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Group leads by city
  const leadsWithCity = leads.filter(l => l.city || l.address || l.state) as unknown as LeadWithCity[]

  const cityCounts = useMemo(() => {
    const map: Record<string, number> = {}
    leads.forEach(l => {
      const city = (l as any).city || (l as any).state || 'Unknown'
      map[city] = (map[city] || 0) + 1
    })
    return map
  }, [leads])

  const cities = useMemo(() => Object.keys(cityCounts).sort((a, b) => cityCounts[b] - cityCounts[a]), [cityCounts])

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const city = (l as any).city || (l as any).state || 'Unknown'
      const matchCity = cityFilter === 'all' || city === cityFilter
      const matchSearch = !search || l.full_name.toLowerCase().includes(search.toLowerCase()) ||
        ((l as any).company || '').toLowerCase().includes(search.toLowerCase())
      return matchCity && matchSearch
    })
  }, [leads, cityFilter, search])

  // Build ordered route — prioritize high intent, then unvisited, then by name
  const routeLeads = useMemo(() => {
    const orderedIds = visitOrder.filter(id => filtered.some(l => l.id === id))
    const unordered = filtered.filter(l => !orderedIds.includes(l.id))
      .sort((a, b) => {
        const intentScore = (i: string) => i === 'high' ? 3 : i === 'medium' ? 2 : 1
        return intentScore(b.buying_intent) - intentScore(a.buying_intent)
      })
    const orderedLeads = orderedIds.map(id => filtered.find(l => l.id === id)!).filter(Boolean)
    return [...orderedLeads, ...unordered]
  }, [filtered, visitOrder])

  const markVisited = useCallback(async (leadId: string, leadName: string) => {
    setMarking(leadId)
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any).eq('id', leadId)
    if (error) {
      toast.error('Failed to mark visited')
    } else {
      setVisited(prev => new Set([...prev, leadId]))
      toast.success(`✅ Marked ${leadName} as visited`)
      refetch()
    }
    setMarking(null)
  }, [refetch])

  const moveUp = (id: string) => {
    setVisitOrder(prev => {
      const arr = prev.includes(id) ? [...prev] : [id, ...filtered.filter(l => l.id !== id).map(l => l.id)]
      const idx = arr.indexOf(id)
      if (idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]] }
      return arr
    })
  }

  const moveDown = (id: string) => {
    setVisitOrder(prev => {
      const arr = prev.includes(id) ? [...prev] : [...filtered.filter(l => l.id !== id).map(l => l.id), id]
      const idx = arr.indexOf(id)
      if (idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]] }
      return arr
    })
  }

  const shareRoute = () => {
    const lines = routeLeads.slice(0, 10).map((l, i) =>
      `${i + 1}. ${l.full_name} — ${(l as any).city || (l as any).address || 'Location TBD'} — ${l.phone_number || 'No phone'}`
    )
    const text = `🗺️ Today's Visit Route:\n\n${lines.join('\n')}\n\n— Sent from Klinq CRM`
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(wa, '_blank')
    toast.success('Route shared to WhatsApp!')
  }

  const openMaps = (lead: any) => {
    const query = encodeURIComponent(`${lead.address || lead.city || lead.full_name}, ${lead.state || 'India'}`)
    window.open(`https://www.google.com/maps/search/${query}`, '_blank')
  }

  const stats = {
    total: filtered.length,
    visited: filtered.filter(l => visited.has(l.id) || (l.last_contacted_at && new Date(l.last_contacted_at) > new Date(Date.now() - 86400000))).length,
    highIntent: filtered.filter(l => l.buying_intent === 'high').length,
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="Route Planner" subtitle="Loading leads…" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Route Planner" subtitle="Plan your field visits — sorted by buying intent, grouped by city" />
      <main className="flex-1 p-4 md:p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Leads on Route', value: stats.total, icon: Navigation },
            { label: 'Visited Today', value: stats.visited, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'High Priority', value: stats.highIntent, icon: Clock, color: 'text-red-500' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
                </div>
                <s.icon className={`size-5 ${s.color || 'text-muted-foreground'} opacity-60`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-48 h-9"
            placeholder="Search leads…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCityFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors border ${cityFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border/60 hover:bg-muted/40'}`}
            >
              All Cities ({leads.length})
            </button>
            {cities.slice(0, 6).map(city => (
              <button
                key={city}
                onClick={() => setCityFilter(city)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors border ${cityFilter === city ? 'bg-foreground text-background border-foreground' : 'border-border/60 hover:bg-muted/40'}`}
              >
                {city} ({cityCounts[city]})
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="size-3.5 mr-1.5" />Refresh</Button>
            <Button size="sm" onClick={shareRoute} disabled={routeLeads.length === 0}><Share2 className="size-3.5 mr-1.5" />Share via WhatsApp</Button>
          </div>
        </div>

        {/* Route List */}
        {routeLeads.length === 0 ? (
          <div className="py-16 text-center border rounded-xl bg-muted/20">
            <MapPin className="size-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No leads with location data</p>
            <p className="text-sm text-muted-foreground mt-1">Add city/address to your leads to use Route Planner</p>
          </div>
        ) : (
          <div className="space-y-2">
            {routeLeads.map((lead, i) => {
              const isVisited = visited.has(lead.id) || (lead.last_contacted_at && new Date(lead.last_contacted_at) > new Date(Date.now() - 86400000))
              const city = (lead as any).city || (lead as any).state || 'Unknown'
              const intentColors = {
                high: 'bg-red-100 text-red-700 border-red-200',
                medium: 'bg-amber-100 text-amber-700 border-amber-200',
                low: 'bg-muted text-muted-foreground border-border',
              }

              return (
                <Card key={lead.id} className={`transition-all ${isVisited ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Stop number */}
                      <div className={`size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 ${isVisited ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-muted border-border'}`}>
                        {isVisited ? <CheckCircle2 className="size-4" /> : i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{lead.full_name}</span>
                          <Badge variant="outline" className={`text-xs ${intentColors[lead.buying_intent as keyof typeof intentColors]}`}>
                            {lead.buying_intent === 'high' ? '🔥 Hot' : lead.buying_intent === 'medium' ? '🌡️ Warm' : '❄️ Cold'}
                          </Badge>
                          {isVisited && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Visited</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="size-3" />{city}</span>
                          {(lead as any).company && <span>{(lead as any).company}</span>}
                          {lead.phone_number && <span className="flex items-center gap-1"><Phone className="size-3" />{lead.phone_number}</span>}
                          {lead.last_contacted_at && (
                            <span className="flex items-center gap-1"><Clock className="size-3" />
                              Last visit {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => moveUp(lead.id)} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors" title="Move up">
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button onClick={() => moveDown(lead.id)} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors" title="Move down">
                          <ArrowDown className="size-3.5" />
                        </button>
                        <button
                          onClick={() => openMaps(lead)}
                          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                          title="Open in Google Maps"
                        >
                          <Navigation className="size-3.5" />
                        </button>
                        {lead.phone_number && (
                          <a href={`https://wa.me/${lead.phone_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors" title="WhatsApp">
                            <MessageSquare className="size-3.5" />
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant={isVisited ? 'outline' : 'default'}
                          onClick={() => markVisited(lead.id, lead.full_name)}
                          disabled={marking === lead.id || !!isVisited}
                          className="h-8 text-xs"
                        >
                          {marking === lead.id ? <Loader2 className="size-3.5 animate-spin" /> : isVisited ? '✓ Done' : 'Mark Visited'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
