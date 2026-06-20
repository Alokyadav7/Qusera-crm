'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Loader2, ArrowLeft, Calendar, ShieldAlert, CheckCircle2, MessageSquare, Plus,
  TrendingUp, Trash, DollarSign, ExternalLink, RefreshCw, Send, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface Lead {
  id: string
  company_id: string
  full_name: string
  phone_number: string | null
  email: string | null
  company: string | null
  status: string
  buying_intent: string
  estimated_budget: number | null
  deal_value: number | null
  city: string | null
  state: string | null
  assigned_to: string | null
  created_at: string
}

interface Interaction {
  id: string
  type: string
  content_raw: string | null
  created_at: string
}

interface Deal {
  id: string
  title: string
  stage: string
  deal_value: number
  created_at: string
}

interface AuditLog {
  id: string
  action: string
  created_at: string
  user_email: string
}

export default function LeadDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  
  // Data States
  const [lead, setLead] = useState<Lead | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  
  // Interactive States
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  
  // Deal Dialog
  const [isDealDialogOpen, setIsDealDialogOpen] = useState(false)
  const [dealTitle, setDealTitle] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [dealStage, setDealStage] = useState('discovery')
  const [addingDeal, setAddingDeal] = useState(false)

  const loadAllData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Auth & Company scope resolution
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: member } = await (supabase as any)
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    // Fetch target lead
    const { data: leadData } = await (supabase as any)
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (!leadData || leadData.company_id !== member.company_id) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    // Role-based visibility check
    const isManagerOrAdmin = ['owner', 'admin', 'manager'].includes(member.role)
    if (!isManagerOrAdmin && leadData.assigned_to !== user.id) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    setLead(leadData)

    // Fetch related records
    const [interactionsRes, dealsRes, auditsRes] = await Promise.all([
      (supabase as any).from('interactions').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      (supabase as any).from('deals').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      (supabase as any).from('audit_logs').select('*').eq('entity_id', id).order('created_at', { ascending: false }).limit(20)
    ])

    setInteractions(interactionsRes.data || [])
    setDeals(dealsRes.data || [])
    setAuditLogs(auditsRes.data || [])
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Save Lead details edits
  async function handleSaveLead(e: React.FormEvent) {
    e.preventDefault()
    if (!lead) return
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('leads')
      .update({
        full_name: lead.full_name,
        company: lead.company,
        phone_number: lead.phone_number,
        email: lead.email,
        status: lead.status,
        buying_intent: lead.buying_intent,
        estimated_budget: lead.estimated_budget ? Number(lead.estimated_budget) : null,
        deal_value: lead.deal_value ? Number(lead.deal_value) : null,
        city: lead.city,
        state: lead.state,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id)

    if (error) {
      toast.error('Failed to update lead: ' + error.message)
    } else {
      toast.success('Lead details saved successfully!')
      loadAllData()
    }
    setSaving(false)
  }

  // Create text note
  async function handleAddNote() {
    if (!newNote.trim() || !lead) return
    setAddingNote(true)
    const supabase = createClient()

    const { error } = await (supabase as any)
      .from('interactions')
      .insert({
        lead_id: lead.id,
        type: 'text',
        content_raw: newNote,
        created_at: new Date().toISOString()
      })

    if (error) {
      toast.error('Failed to save note: ' + error.message)
    } else {
      toast.success('Note added!')
      setNewNote('')
      loadAllData()
    }
    setAddingNote(false)
  }

  // Create Deal
  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!dealTitle || !lead) return
    setAddingDeal(true)
    const supabase = createClient()

    const { error } = await (supabase as any)
      .from('deals')
      .insert({
        company_id: lead.company_id,
        lead_id: lead.id,
        title: dealTitle,
        stage: dealStage,
        deal_value: dealValue ? Number(dealValue) : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      toast.error('Failed to create deal: ' + error.message)
    } else {
      toast.success('Deal created!')
      setIsDealDialogOpen(false)
      setDealTitle('')
      setDealValue('')
      loadAllData()
    }
    setAddingDeal(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Fetching lead intelligence file...</p>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md border-destructive/20 bg-destructive/[0.01]">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <ShieldAlert className="size-8 text-destructive" />
            <div>
              <CardTitle className="text-base font-bold text-destructive">Security Boundary Restrict</CardTitle>
              <CardDescription>Multi-tenant boundary verification failed.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-normal">
              You do not have access permissions to view this lead, or the lead has been reassigned/deleted.
            </p>
            <Button size="sm" onClick={() => router.push('/dashboard/leads')} className="w-full">
              Back to Leads Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!lead) return null

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center gap-3 px-6 pt-5">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/leads')} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lead Records File</p>
          <h1 className="text-xl font-bold text-foreground">{lead.full_name}</h1>
        </div>
        <Button size="sm" variant="outline" onClick={loadAllData} className="gap-1.5 text-xs shadow-sm">
          <RefreshCw className="size-3.5" />
          Reload
        </Button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* LEFT COLUMN: Metadata Fields, Notes (60% width = 6 spans) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Metadata Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Lead Details Profile</CardTitle>
                <CardDescription>Update general metadata and qualification parameters</CardDescription>
              </div>
              <Badge variant={lead.buying_intent === 'high' ? 'default' : 'secondary'} className="uppercase font-bold text-[9px] tracking-wider">
                {lead.buying_intent} Intent
              </Badge>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSaveLead} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      value={lead.full_name || ''}
                      onChange={e => setLead({ ...lead, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company</Label>
                    <Input
                      value={lead.company || ''}
                      onChange={e => setLead({ ...lead, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      value={lead.phone_number || ''}
                      onChange={e => setLead({ ...lead, phone_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Address</Label>
                    <Input
                      type="email"
                      value={lead.email || ''}
                      onChange={e => setLead({ ...lead, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={lead.status}
                      onValueChange={val => setLead({ ...lead, status: val })}
                    >
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">🆕 New</SelectItem>
                        <SelectItem value="contacted">📞 Contacted</SelectItem>
                        <SelectItem value="interested">⚡ Interested</SelectItem>
                        <SelectItem value="verified">✅ Verified</SelectItem>
                        <SelectItem value="negotiation">🤝 Negotiation</SelectItem>
                        <SelectItem value="closed_won">🎉 Closed Won</SelectItem>
                        <SelectItem value="closed_lost">❌ Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Buying Intent</Label>
                    <Select
                      value={lead.buying_intent}
                      onValueChange={val => setLead({ ...lead, buying_intent: val })}
                    >
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔥 High</SelectItem>
                        <SelectItem value="medium">⚡ Medium</SelectItem>
                        <SelectItem value="low">❄️ Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estimated Budget (INR)</Label>
                    <Input
                      type="number"
                      value={lead.estimated_budget || ''}
                      onChange={e => setLead({ ...lead, estimated_budget: Number(e.target.value) || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Deal Value (INR)</Label>
                    <Input
                      type="number"
                      value={lead.deal_value || ''}
                      onChange={e => setLead({ ...lead, deal_value: Number(e.target.value) || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">City</Label>
                    <Input
                      value={lead.city || ''}
                      onChange={e => setLead({ ...lead, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">State</Label>
                    <Input
                      value={lead.state || ''}
                      onChange={e => setLead({ ...lead, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 flex justify-end">
                  <Button type="submit" disabled={saving} size="sm" className="gap-1.5 text-xs shadow-sm">
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    Save Lead Parameters
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notes & Activities Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <MessageSquare className="size-4 text-primary" /> Lead Activity Notes
              </CardTitle>
              <CardDescription>Workspace activity log entries and custom annotations</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              
              {/* Note Create Input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Record note logs, conversation takeaways, or updates..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
                <div className="flex justify-end">
                  <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} size="sm" className="gap-1.5 text-xs">
                    {addingNote ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Post Note Log
                  </Button>
                </div>
              </div>

              {/* Note Log List */}
              <div className="space-y-3 pt-3 border-t border-border/40">
                {interactions.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">No workspace notes or interactions logged yet.</p>
                ) : (
                  interactions.map(n => (
                    <div key={n.id} className="p-3 border rounded-xl bg-muted/20 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                        <span className="uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground">
                          {n.type}
                        </span>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap mt-1.5">{n.content_raw}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Timeline, Deals, WhatsApp Status (40% width = 4 spans) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* WhatsApp communication status card */}
          <Card className="border-border/60 bg-[#25D366]/[0.01]">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">WhatsApp Channel</CardTitle>
                <CardDescription>Verified communications channel status</CardDescription>
              </div>
              <Badge className="bg-[#25D366]/10 text-[#25D366] border-0 hover:bg-[#25D366]/20 font-bold uppercase text-[9px] tracking-wider">
                Cloud API Active
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-normal">
                Deliver notifications, onboarding details, and documents to <strong>{lead.phone_number || 'No number'}</strong>.
              </p>
              {lead.phone_number ? (
                <Button
                  onClick={() => window.open(`https://wa.me/${lead.phone_number?.replace(/\D/g, '')}`)}
                  className="w-full text-xs font-semibold gap-1.5 shadow-sm bg-[#25D366] hover:bg-[#1ebd59] text-white border-0"
                >
                  <MessageSquare className="size-4" />
                  Trigger WhatsApp Chat
                </Button>
              ) : (
                <Button disabled className="w-full text-xs">
                  Missing Phone Number
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Connected Deals Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Associated Deals</CardTitle>
                <CardDescription>Total pipelines connected to this client</CardDescription>
              </div>
              
              <Dialog open={isDealDialogOpen} onOpenChange={setIsDealDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-8">
                    <Plus className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Associated Deal</DialogTitle>
                    <DialogDescription>Link a new deal pipeline directly to this client.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateDeal} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Deal Pipeline Title</Label>
                      <Input
                        placeholder="Corporate Onboarding Order"
                        value={dealTitle}
                        onChange={e => setDealTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Deal Value (INR)</Label>
                      <Input
                        type="number"
                        placeholder="500000"
                        value={dealValue}
                        onChange={e => setDealValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pipeline Stage</Label>
                      <Select value={dealStage} onValueChange={setDealStage}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discovery">Discovery</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsDealDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={addingDeal} size="sm">
                        {addingDeal ? <Loader2 className="size-3.5 animate-spin" /> : 'Create & Link'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {deals.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No deals currently linked to this client profile.</p>
              ) : (
                deals.map(d => (
                  <div key={d.id} className="p-3 border rounded-xl hover:bg-muted/10 transition-colors flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{d.stage.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">₹{d.deal_value?.toLocaleString()}</p>
                      <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/deals')} className="size-6 mt-1">
                        <ExternalLink className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Timeline / Audit Logs Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold">Activity Trail</CardTitle>
              <CardDescription>Immutable tracking logs for modifications</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4 relative pl-4 border-l border-border/60 ml-2">
                {auditLogs.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4 -ml-4">No logged audit actions found.</p>
                ) : (
                  auditLogs.map(l => (
                    <div key={l.id} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-bold uppercase tracking-wider">{l.action.replace('lead.', '')}</span>
                        <span>{new Date(l.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-foreground font-medium">{l.user_email}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}
