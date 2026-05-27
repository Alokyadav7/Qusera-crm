'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Navigation, Clock, Car, Route, Fuel,
  ChevronDown, ChevronUp, Phone, MessageSquare,
  CheckCircle2, AlertCircle, RotateCw, Plus, Calendar,
  Loader2, ExternalLink, Target, Zap
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay } from 'date-fns'

interface RouteStop {
  id: string
  order: number
  taskId: string
  taskTitle: string
  taskType: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  scheduledTime: string
  duration: string
  status: 'pending' | 'visited' | 'skipped'
  notes: string | null
  leadId: string | null
  leadName: string
  company: string | null
  phone: string | null
  address: string | null
  isCompleted: boolean
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-muted text-foreground border-border'
    case 'high':     return 'bg-muted text-foreground border-border'
    case 'medium':   return 'bg-muted/50 text-muted-foreground border-border'
    case 'low':      return 'bg-muted/30 text-muted-foreground border-border'
    default:         return 'bg-muted/30 text-muted-foreground border-border'
  }
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return `Today, ${format(date, 'MMM d')}`
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'MMM d')}`
  return format(date, 'EEE, MMM d')
}

export default function RoutesPage() {
  const [stops, setStops] = useState<RouteStop[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStop, setExpandedStop] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set())
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ address: '', scheduledTime: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [startLocation, setStartLocation] = useState('Your Office')
  const router = useRouter()

  // ── Fetch tasks with location for selected date ──────────────────────────────
  const fetchStops = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const dayStart = startOfDay(selectedDate).toISOString()
    const dayEnd = endOfDay(selectedDate).toISOString()

    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        id, title, task_type, priority, due_date, description, is_completed,
        location_address,
        lead:leads(id, full_name, company, phone_number)
      `)
      .gte('due_date', dayStart)
      .lte('due_date', dayEnd)
      .order('due_date', { ascending: true })

    if (tasks) {
      const mapped: RouteStop[] = tasks.map((t, i) => ({
        id: t.id,
        order: i + 1,
        taskId: t.id,
        taskTitle: t.title,
        taskType: t.task_type || 'other',
        priority: (t.priority || 'medium') as RouteStop['priority'],
        scheduledTime: format(new Date(t.due_date), 'h:mm a'),
        duration: '30 mins',
        status: t.is_completed ? 'visited' : 'pending',
        notes: t.description,
        leadId: (t.lead as any)?.id || null,
        leadName: (t.lead as any)?.full_name || 'Unknown Contact',
        company: (t.lead as any)?.company || null,
        phone: (t.lead as any)?.phone_number || null,
        address: t.location_address || null,
        isCompleted: t.is_completed,
      }))
      setStops(mapped)
      if (mapped.length > 0) setExpandedStop(mapped[0].id)
    }
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { fetchStops() }, [fetchStops])

  // ── Real-time subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime-routes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchStops)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchStops])

  // ── Mark visited ─────────────────────────────────────────────────────────────
  const markVisited = useCallback(async (stopId: string) => {
    const supabase = createClient()
    await supabase.from('tasks').update({ is_completed: true, updated_at: new Date().toISOString() }).eq('id', stopId)
    setVisitedIds(prev => new Set([...prev, stopId]))
    toast.success('Stop marked as visited ✅')
  }, [])

  // ── Navigate via Google Maps ─────────────────────────────────────────────────
  const navigateTo = (address: string | null) => {
    if (!address) { toast.error('No address set for this stop'); return }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`
    window.open(url, '_blank')
  }

  // ── Open in Google Maps with full route ──────────────────────────────────────
  const openFullRoute = () => {
    const withAddress = stops.filter(s => s.address)
    if (withAddress.length === 0) { toast.error('No stops have addresses set'); return }
    const waypoints = withAddress.slice(0, -1).map(s => encodeURIComponent(s.address!)).join('|')
    const destination = encodeURIComponent(withAddress[withAddress.length - 1].address!)
    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    window.open(url, '_blank')
  }

  // ── Add stop (set location on existing task) ─────────────────────────────────
  const handleAddStop = async () => {
    if (!addForm.address) { toast.error('Address is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: `Visit: ${addForm.address.split(',')[0]}`,
      description: addForm.notes || null,
      due_date: addForm.scheduledTime || new Date(selectedDate.setHours(10, 0)).toISOString(),
      priority: 'medium',
      task_type: 'site_visit',
      location_address: addForm.address,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) { toast.error(error.message) }
    else {
      toast.success('Stop added to route!')
      setAddForm({ address: '', scheduledTime: '', notes: '' })
      setIsAddOpen(false)
    }
    setSaving(false)
  }

  // ── Computed stats ────────────────────────────────────────────────────────────
  const visited = stops.filter(s => s.isCompleted || visitedIds.has(s.id)).length
  const pending = stops.length - visited
  const withAddress = stops.filter(s => s.address).length
  const optimizationScore = stops.length > 0 ? Math.round((visited / stops.length) * 100) : 0

  const dateOptions = [0, 1, 2, 3].map(i => addDays(new Date(), i))

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Route Planner"
        subtitle={loading ? 'Loading…' : `${stops.length} stops · ${visited} visited · Live from Supabase`}
      />

      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">

          {/* Left: Map + Stats */}
          <div className="space-y-6">
            {/* Map Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative h-[380px] bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
                  {/* SVG Route visualization */}
                  <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                    {stops.length > 1 && (
                      <path
                        d={`M 80 340 ${stops.map((_, i) => {
                          const x = 80 + (i * (560 / Math.max(stops.length - 1, 1)))
                          const y = 340 - (i * 40) + (i % 2 === 0 ? 0 : 20)
                          return `Q ${x + 40} ${y - 30} ${x} ${y}`
                        }).join(' ')}`}
                        fill="none" stroke="#6366f1" strokeWidth="3"
                        strokeDasharray="8 4" opacity="0.5"
                      />
                    )}
                    {stops.map((stop, i) => {
                      const x = 80 + (i * (Math.min(560, 560) / Math.max(stops.length - 1, 1)))
                      const y = 340 - (i * 40) + (i % 2 === 0 ? 0 : 20)
                      const isVisited = stop.isCompleted || visitedIds.has(stop.id)
                      return (
                        <g key={stop.id}>
                          <circle cx={Math.min(x, 630)} cy={Math.max(y, 60)} r="16"
                            fill={isVisited ? '#22c55e' : stop.priority === 'critical' ? '#ef4444' : '#6366f1'} />
                          <text x={Math.min(x, 630)} y={Math.max(y, 60) + 5}
                            textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                            {isVisited ? '✓' : stop.order}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Empty state */}
                  {!loading && stops.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="size-16 text-primary/20 mx-auto mb-3" />
                        <p className="font-semibold text-slate-500">No stops for {formatDateLabel(selectedDate)}</p>
                        <p className="text-sm text-slate-400 mt-1">Tasks with addresses will appear here</p>
                        <Button size="sm" className="mt-3" onClick={() => setIsAddOpen(true)}>
                          <Plus className="size-4 mr-1" />Add Stop
                        </Button>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="size-8 animate-spin text-primary/40" />
                    </div>
                  )}

                  {/* Bottom bar */}
                  {stops.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <Card className="shadow-lg">
                        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Route className="size-4 text-primary" />
                            <span className="font-medium text-sm">{stops.length} stops</span>
                          </div>
                          <div className="w-px h-5 bg-border hidden sm:block" />
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            <span className="font-medium text-emerald-600 text-sm">{visited} visited</span>
                          </div>
                          {withAddress > 0 && (
                            <>
                              <div className="w-px h-5 bg-border hidden sm:block" />
                              <div className="flex items-center gap-2">
                                <MapPin className="size-4 text-blue-600" />
                                <span className="font-medium text-blue-600 text-sm">{withAddress} mapped</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                      <Button className="shadow-lg self-end sm:self-auto" onClick={openFullRoute}
                        disabled={withAddress === 0}>
                        <Navigation className="size-4 mr-2" />
                        Open in Maps
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{stops.length}</p>
                  <p className="text-sm text-muted-foreground">Total Stops</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{visited}</p>
                  <p className="text-sm text-muted-foreground">Visited</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{pending}</p>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{optimizationScore}%</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right: Route List */}
          <div className="space-y-4">
            {/* Date Selector + Actions */}
            <div className="flex items-center gap-2">
              <Select
                value={format(selectedDate, 'yyyy-MM-dd')}
                onValueChange={v => setSelectedDate(new Date(v))}
              >
                <SelectTrigger className="flex-1">
                  <Calendar className="size-4 mr-2 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map(d => (
                    <SelectItem key={d.toISOString()} value={format(d, 'yyyy-MM-dd')}>
                      {formatDateLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchStops} title="Refresh">
                <RotateCw className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsAddOpen(true)} title="Add stop">
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Stops List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="size-5" />
                  {formatDateLabel(selectedDate)}'s Route
                </CardTitle>
                <CardDescription>
                  {loading ? 'Loading stops…' :
                    stops.length === 0 ? 'No tasks scheduled for this day' :
                    `${stops.length} stops from your tasks — real-time`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">

                {/* Start Point */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex size-8 items-center justify-center rounded-full bg-foreground text-background shrink-0">
                    <Zap className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Start Point</p>
                    <p className="text-xs text-muted-foreground truncate">{startLocation}</p>
                  </div>
                </div>

                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Stops */}
                {!loading && stops.length > 0 && (
                  <div className="relative pl-4 ml-4 border-l-2 border-dashed border-primary/30 space-y-2">
                    {stops.map((stop) => {
                      const isVisited = stop.isCompleted || visitedIds.has(stop.id)
                      return (
                        <div key={stop.id} className="relative -ml-[21px]">
                          <Card className={`overflow-hidden ${
                            isVisited ? 'opacity-70' :
                            stop.priority === 'critical' ? 'border-red-200' : ''
                          }`}>
                            <CardContent className="p-0">
                              {/* Stop header */}
                              <button
                                className="w-full p-3 flex items-start gap-3 text-left hover:bg-muted/50 transition-colors"
                                onClick={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}
                              >
                                <div className={`flex size-8 items-center justify-center rounded-full border-2 bg-background shrink-0 ${
                                  isVisited ? 'border-emerald-500 text-emerald-600' :
                                  stop.priority === 'critical' ? 'border-red-500 text-red-600' :
                                  stop.priority === 'high' ? 'border-orange-500 text-orange-600' :
                                  'border-primary text-primary'
                                }`}>
                                  {isVisited
                                    ? <CheckCircle2 className="size-4" />
                                    : <span className="text-sm font-bold">{stop.order}</span>
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`font-medium text-sm ${isVisited ? 'line-through text-muted-foreground' : ''}`}>
                                      {stop.leadName}
                                    </span>
                                    <Badge variant="outline" className={`text-xs ${getPriorityColor(stop.priority)}`}>
                                      {stop.priority}
                                    </Badge>
                                  </div>
                                  {stop.company && <p className="text-xs text-muted-foreground">{stop.company}</p>}
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="size-3" />{stop.scheduledTime}
                                    </span>
                                    <span className="capitalize text-primary/70">{stop.taskType.replace('_', ' ')}</span>
                                  </div>
                                </div>
                                {expandedStop === stop.id
                                  ? <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                                  : <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                                }
                              </button>

                              {/* Expanded */}
                              {expandedStop === stop.id && (
                                <div className="px-3 pb-3 space-y-3 border-t">
                                  <div className="pt-3 space-y-2">
                                    {stop.address ? (
                                      <div className="flex items-start gap-2">
                                        <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <p className="text-sm">{stop.address}</p>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-amber-600">
                                        <AlertCircle className="size-4" />
                                        <p className="text-xs">No address set on this task</p>
                                      </div>
                                    )}
                                    {stop.notes && (
                                      <div className="bg-muted/50 rounded p-2">
                                        <p className="text-xs font-medium mb-1">Task: {stop.taskTitle}</p>
                                        <p className="text-xs text-muted-foreground">{stop.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    {stop.phone && (
                                      <Button size="sm" variant="outline" className="flex-1"
                                        onClick={() => window.open(`tel:${stop.phone}`)}>
                                        <Phone className="size-4 mr-1" />Call
                                      </Button>
                                    )}
                                    {stop.phone && (
                                      <Button size="sm" variant="outline" className="flex-1"
                                        onClick={() => window.open(`https://wa.me/${stop.phone?.replace(/\D/g, '')}`)}>
                                        <MessageSquare className="size-4 mr-1" />WA
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="flex-1"
                                      onClick={() => navigateTo(stop.address)}
                                      disabled={!stop.address}>
                                      <Navigation className="size-4 mr-1" />Nav
                                    </Button>
                                    {!isVisited && (
                                      <Button size="sm" className="flex-1"
                                        onClick={() => markVisited(stop.id)}>
                                        <CheckCircle2 className="size-4 mr-1" />Done
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty */}
                {!loading && stops.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="size-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tasks for {formatDateLabel(selectedDate)}</p>
                    <p className="text-xs mt-1">Create tasks with a location to see them here</p>
                    <Button size="sm" className="mt-3" onClick={() => router.push('/dashboard/tasks')}>
                      Go to Tasks
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Add Stop Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />Add Route Stop
            </DialogTitle>
            <DialogDescription>
              Creates a site-visit task for {formatDateLabel(selectedDate)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Address <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. 123 MG Road, Fort, Mumbai"
                value={addForm.address}
                onChange={e => setAddForm(p => ({ ...p, address: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled Time</Label>
              <Input
                type="datetime-local"
                value={addForm.scheduledTime}
                onChange={e => setAddForm(p => ({ ...p, scheduledTime: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="What to do at this stop?"
                value={addForm.notes}
                onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStop} disabled={saving || !addForm.address}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
              Add Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
