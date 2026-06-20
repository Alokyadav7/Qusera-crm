'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Search, LayoutGrid, List, TrendingUp, AlertTriangle, IndianRupee, Calendar, ChevronRight } from 'lucide-react'

const STAGES = [
  { id: 'prospect',    label: 'Prospect',    color: 'bg-slate-100 dark:bg-slate-800',   probability: 10 },
  { id: 'qualified',   label: 'Qualified',   color: 'bg-blue-100 dark:bg-blue-900/30',  probability: 25 },
  { id: 'proposal',    label: 'Proposal',    color: 'bg-violet-100 dark:bg-violet-900/30', probability: 50 },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 dark:bg-amber-900/30', probability: 75 },
  { id: 'won',         label: 'Won',         color: 'bg-emerald-100 dark:bg-emerald-900/30', probability: 100 },
  { id: 'lost',        label: 'Lost',        color: 'bg-red-100 dark:bg-red-900/30',    probability: 0 },
]

export interface Deal {
  id: string
  company_id: string
  title: string
  value: number
  currency: string
  stage: string
  close_date: string | null
  contact_id: string | null
  assigned_to: string | null
  created_by?: string | null
  probability: number
  notes: string | null
  last_activity_at: string
  created_at: string
  contact?: { full_name: string; email: string | null } | null
}

const STALE_DAYS = 7

export function DealsPageClient({
  initialDeals,
  userRole,
  currentUserId,
  companyId,
}: {
  initialDeals: Deal[]
  userRole: string
  currentUserId: string
  companyId: string
}) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', value: '', stage: 'prospect', close_date: '', notes: '', probability: '10' })

  // ── Fetch + Realtime ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      let q = (supabase as any)
        .from('deals')
        .select('*, contact:contacts(full_name, email)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      
      const isManagerOrAdmin = ['owner', 'admin', 'manager'].includes(userRole)
      if (!isManagerOrAdmin) {
        q = q.or(`assigned_to.eq.${currentUserId},created_by.eq.${currentUserId}`)
      }
      
      const { data, error } = await q
      if (!error && data) { setDeals(data as Deal[]) }
    }
    load()

    const supabase = createClient()
    const ch = supabase
      .channel('deals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, payload => {
        const newDeal = payload.new as Deal
        const oldDeal = payload.old as Deal

        if (payload.eventType === 'INSERT') {
          if (newDeal.company_id === companyId) {
            const isManagerOrAdmin = ['owner', 'admin', 'manager'].includes(userRole)
            if (isManagerOrAdmin || newDeal.assigned_to === currentUserId || newDeal.created_by === currentUserId) {
              setDeals(p => [newDeal, ...p])
            }
          }
        }
        else if (payload.eventType === 'UPDATE') {
          if (newDeal.company_id === companyId) {
            const isManagerOrAdmin = ['owner', 'admin', 'manager'].includes(userRole)
            if (isManagerOrAdmin || newDeal.assigned_to === currentUserId || newDeal.created_by === currentUserId) {
              setDeals(p => p.map(d => d.id === newDeal.id ? { ...d, ...newDeal } : d))
            } else {
              setDeals(p => p.filter(d => d.id !== newDeal.id))
            }
          }
        }
        else if (payload.eventType === 'DELETE') {
          setDeals(p => p.filter(d => d.id !== oldDeal.id))
        }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, userRole, currentUserId])

  const isStale = (d: Deal) => {
    if (['won', 'lost'].includes(d.stage)) return false
    const days = (Date.now() - new Date(d.last_activity_at).getTime()) / 86400000
    return days >= STALE_DAYS
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()
    const companyId = uac?.data?.company_id ?? null
    const { error } = await (supabase as any).from('deals').insert({
      title: form.title,
      value: Number(form.value) || 0,
      stage: form.stage,
      close_date: form.close_date || null,
      notes: form.notes || null,
      probability: Number(form.probability) || 10,
      company_id: companyId,
      created_by: user!.id,
      last_activity_at: new Date().toISOString(),
    })
    if (error) { toast.error(error.message) } else { toast.success('Deal created'); setAddOpen(false); setForm({ title: '', value: '', stage: 'prospect', close_date: '', notes: '', probability: '10' }) }
    setSaving(false)
  }

  const moveStage = async (dealId: string, newStage: string) => {
    const supabase = createClient()
    const prob = STAGES.find(s => s.id === newStage)?.probability ?? 10
    await (supabase as any).from('deals').update({ stage: newStage, probability: prob, last_activity_at: new Date().toISOString() }).eq('id', dealId)
    setDeals(p => p.map(d => d.id === dealId ? { ...d, stage: newStage, probability: prob } : d))
    toast.success(`Moved to ${STAGES.find(s => s.id === newStage)?.label}`)
  }

  const filtered = deals.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.contact?.full_name?.toLowerCase().includes(search.toLowerCase()))

  const totalPipeline = deals.filter(d => !['won','lost'].includes(d.stage)).reduce((s, d) => s + (d.value * d.probability / 100), 0)
  const wonValue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Deals" subtitle={`₹${(totalPipeline/100000).toFixed(1)}L weighted pipeline · ₹${(wonValue/100000).toFixed(1)}L won`} />
      <main className="flex-1 p-4 md:p-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAGES.slice(0,4).map(s => {
            const stageDeals = deals.filter(d => d.stage === s.id)
            return (
              <div key={s.id} className={`${s.color} rounded-xl p-3 border`}>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold mt-1">{stageDeals.length}</p>
                <p className="text-xs text-muted-foreground">₹{(stageDeals.reduce((a,d)=>a+d.value,0)/1000).toFixed(0)}K</p>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search deals..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-0.5">
              <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setView('kanban')}><LayoutGrid className="size-4" /></Button>
              <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setView('list')}><List className="size-4" /></Button>
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="size-4 mr-1" /> New Deal</Button>
          </div>
        </div>

        {/* Kanban */}
        {view === 'kanban' ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map(stage => {
              const stageDeals = filtered.filter(d => d.stage === stage.id)
              return (
                <div key={stage.id} className="flex-shrink-0 w-64"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); if (dragging) moveStage(dragging, stage.id) }}>
                  <div className={`${stage.color} rounded-xl p-3 mb-2 border`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{stage.label}</span>
                      <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">₹{(stageDeals.reduce((a,d)=>a+d.value,0)/1000).toFixed(0)}K</p>
                  </div>
                  <div className="space-y-2">
                    {stageDeals.map(d => (
                      <div key={d.id} draggable
                        onDragStart={() => setDragging(d.id)}
                        onDragEnd={() => setDragging(null)}
                        className={`bg-card border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${isStale(d) ? 'border-amber-400 dark:border-amber-600' : ''}`}>
                        {isStale(d) && (
                          <div className="flex items-center gap-1 text-amber-600 text-xs mb-1.5">
                            <AlertTriangle className="size-3" /> Stale {STALE_DAYS}+ days
                          </div>
                        )}
                        <p className="font-medium text-sm">{d.title}</p>
                        {d.contact?.full_name && <p className="text-xs text-muted-foreground">{d.contact.full_name}</p>}
                        <div className="flex items-center gap-1.5 mt-2">
                          <IndianRupee className="size-3 text-muted-foreground" />
                          <span className="text-sm font-semibold">₹{(d.value/1000).toFixed(0)}K</span>
                          <span className="text-xs text-muted-foreground ml-auto">{d.probability}%</span>
                        </div>
                        {d.close_date && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Calendar className="size-3" /> {new Date(d.close_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="border-2 border-dashed rounded-xl p-4 text-center text-xs text-muted-foreground">
                        Drop deals here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>{['Deal','Contact','Value','Stage','Close Date','Probability'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(d => (
                  <tr key={d.id} className={`hover:bg-muted/30 transition-colors ${isStale(d) ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {isStale(d) && <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />}
                        {d.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.contact?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold">₹{d.value.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="capitalize">{d.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.close_date ? new Date(d.close_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${d.probability}%` }} />
                        </div>
                        <span className="text-xs">{d.probability}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">No deals yet</div>
            )}
          </div>
        )}
      </main>

      {/* New Deal Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5"><Label>Deal Title *</Label><Input placeholder="Enterprise Package - Acme Inc." value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Value (₹)</Label><Input type="number" placeholder="500000" value={form.value} onChange={e => setForm(p=>({...p,value:e.target.value}))} /></div>
              <div className="grid gap-1.5"><Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm(p=>({...p,stage:v,probability:String(STAGES.find(s=>s.id===v)?.probability??10)}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s=><SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Close Date</Label><Input type="date" value={form.close_date} onChange={e => setForm(p=>({...p,close_date:e.target.value}))} /></div>
              <div className="grid gap-1.5"><Label>Probability (%)</Label><Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm(p=>({...p,probability:e.target.value}))} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Notes</Label><Input placeholder="Key details..." value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create Deal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
