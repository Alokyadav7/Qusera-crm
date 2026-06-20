'use client'

import { useState, useEffect } from 'react'
import { 
  X, Phone, Mail, MessageSquare, Building2, Calendar,
  CheckCircle2, XCircle, Clock, FileCheck, IndianRupee, Mic,
  User, CreditCard, AlertTriangle, TrendingUp, Pencil, Save,
  Loader2, ArrowUpRight, ArrowDownLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, formatDistanceToNow } from 'date-fns'
import type { Lead } from '@/hooks/use-realtime-leads'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface LeadDetailPanelProps {
  lead: Lead
  onClose: () => void
  onLeadUpdated?: () => void
  profiles?: Array<{ id: string; full_name: string; email: string; role: string }>
}

interface Interaction {
  id: string
  type: string
  direction: string
  content_raw: string | null
  content_transcribed: string | null
  sentiment_score: number | null
  created_at: string
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'new': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/30'
    case 'contacted': return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/30'
    case 'interested': return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/30'
    case 'verified': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30'
    case 'negotiation': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30'
    case 'closed_won': return 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/30'
    case 'closed_lost': return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/30'
    default: return 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800'
  }
}

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

function getComplianceStatus(status: string) {
  switch (status) {
    case 'verified': return { icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30', label: 'Verified' }
    case 'invalid': return { icon: XCircle, color: 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30', label: 'Invalid' }
    default: return { icon: Clock, color: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30', label: 'Pending' }
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getInteractionIcon(type: string) {
  const map: Record<string, string> = { voice: '🎙️', whatsapp: '💬', call: '📞', email: '✉️', image: '🖼️' }
  return map[type] || '💬'
}

export function LeadDetailPanel({ lead, onClose, onLeadUpdated, profiles = [] }: LeadDetailPanelProps) {
  const gstStatus = getComplianceStatus(lead.gst_status)
  const panStatus = getComplianceStatus(lead.pan_status)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loadingInteractions, setLoadingInteractions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: lead.full_name,
    phone_number: lead.phone_number || '',
    email: lead.email || '',
    company: lead.company || '',
    status: lead.status,
    buying_intent: lead.buying_intent || 'medium',
    estimated_budget: lead.estimated_budget?.toString() || '',
    deal_value: lead.deal_value?.toString() || '',
    city: lead.city || '',
    state: lead.state || '',
  })

  // Fetch this lead's interactions
  useEffect(() => {
    setLoadingInteractions(true)
    const supabase = createClient()
    supabase
      .from('interactions')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setInteractions(data as unknown as Interaction[])
        setLoadingInteractions(false)
      })
    // Real-time subscribe
    const channel = supabase
      .channel(`lead-detail-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions', filter: `lead_id=eq.${lead.id}` },
        (payload) => setInteractions(prev => [payload.new as Interaction, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [lead.id])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({
      full_name: editForm.full_name,
      phone_number: editForm.phone_number || null,
      email: editForm.email || null,
      company: editForm.company || null,
      status: editForm.status,
      buying_intent: editForm.buying_intent,
      estimated_budget: editForm.estimated_budget ? Number(editForm.estimated_budget) : null,
      deal_value: editForm.deal_value ? Number(editForm.deal_value) : null,
      city: editForm.city || null,
      state: editForm.state || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    if (error) toast.error(error.message)
    else { toast.success('Lead updated!'); setIsEditing(false); onLeadUpdated?.() }
    setSaving(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl shadow-primary/10 z-50 flex flex-col animate-in slide-in-from-right-full duration-300 ease-out">
      {/* Header */}
      <div className="flex items-start gap-4 p-6 border-b">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {getInitials(lead.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold truncate">{lead.full_name}</h2>
            <Badge variant="outline" className={getStatusColor(lead.status)}>
              {lead.status.replace('_', ' ')}
            </Badge>
          </div>
          {lead.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="size-3" />
              {lead.company}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className={getSentimentColor(lead.sentiment_score)}>
              {getSentimentLabel(lead.sentiment_score)} ({lead.sentiment_score.toFixed(2)})
            </Badge>
            <Badge variant={lead.buying_intent === 'high' ? 'default' : 'secondary'}>
              {lead.buying_intent} intent
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(e => !e)} title="Edit lead">
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 p-4 border-b">
        <Button
          className="flex-1" size="sm"
          onClick={() => lead.phone_number ? window.open(`tel:${lead.phone_number}`) : toast.error('No phone number')}
        >
          <Phone className="size-4 mr-1" />Call
        </Button>
        <Button
          className="flex-1" variant="outline" size="sm"
          onClick={() => lead.phone_number
            ? window.open(`https://wa.me/${lead.phone_number.replace(/\D/g, '')}`)
            : toast.error('No phone number')}
        >
          <MessageSquare className="size-4 mr-1" />WhatsApp
        </Button>
        <Button
          className="flex-1" variant="outline" size="sm"
          onClick={() => lead.email ? window.open(`mailto:${lead.email}`) : toast.error('No email address')}
        >
          <Mail className="size-4 mr-1" />Email
        </Button>
        <Button
          variant="outline" size="icon" className="shrink-0"
          onClick={() => window.open('/dashboard/voice')}
          title="Voice note"
        >
          <Mic className="size-4" />
        </Button>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b px-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interactions">
            Interactions {interactions.length > 0 && `(${interactions.length})`}
          </TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="m-0 p-4 space-y-4">
            {isEditing ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pencil className="size-4" />Edit Lead
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Full Name *</Label>
                      <Input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={editForm.phone_number} onChange={e => setEditForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Company</Label>
                      <Input value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v as any }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['new','contacted','interested','verified','negotiation','closed_won','closed_lost'].map(s => (
                            <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Buying Intent</Label>
                      <Select value={editForm.buying_intent} onValueChange={v => setEditForm(p => ({ ...p, buying_intent: v as "high" | "medium" | "low" }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">🔥 High</SelectItem>
                          <SelectItem value="medium">⚡ Medium</SelectItem>
                          <SelectItem value="low">❄️ Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Est. Budget (₹)</Label>
                      <Input type="number" value={editForm.estimated_budget} onChange={e => setEditForm(p => ({ ...p, estimated_budget: e.target.value }))} placeholder="500000" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Deal Value (₹)</Label>
                      <Input type="number" value={editForm.deal_value} onChange={e => setEditForm(p => ({ ...p, deal_value: e.target.value }))} placeholder="450000" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State</Label>
                      <Input value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving || !editForm.full_name}>
                      {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Save className="size-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* AI Summary */}
                {lead.ai_summary && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="size-4 text-primary" />
                        <span className="text-sm font-medium">AI Summary</span>
                      </div>
                      <p className="text-sm">{lead.ai_summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Contact Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="size-4" />Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      {lead.phone_number
                        ? <a href={`tel:${lead.phone_number}`} className="text-sm font-medium text-primary hover:underline">{lead.phone_number}</a>
                        : <span className="text-sm text-muted-foreground">Not provided</span>}
                    </div>
                    {lead.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <a href={`mailto:${lead.email}`} className="text-sm font-medium text-primary hover:underline truncate max-w-[200px]">{lead.email}</a>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Language</span>
                      <span className="text-sm font-medium capitalize">{lead.preferred_language || 'English'}</span>
                    </div>
                    {(lead.city || lead.state) && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <span className="text-sm font-medium">{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <IndianRupee className="size-4" />Financial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estimated Budget</span>
                      <span className="text-sm font-medium text-emerald-600">
                        {lead.estimated_budget ? formatIndianCurrency(lead.estimated_budget) : '—'}
                      </span>
                    </div>
                    {lead.deal_value && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Deal Value</span>
                        <span className="text-sm font-medium text-emerald-600">{formatIndianCurrency(lead.deal_value)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="size-4" />Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    {(() => {
                      const creator = profiles.find(p => p.id === lead.user_id)
                      if (!creator) return null
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Stored By</span>
                          <span className="text-sm font-medium">{creator.full_name} ({creator.role === 'sales' ? 'sales rep' : creator.role})</span>
                        </div>
                      )
                    })()}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <span className="text-sm">{formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}</span>
                    </div>
                    {lead.last_contacted_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Contact</span>
                        <span className="text-sm">{formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── INTERACTIONS TAB ── */}
          <TabsContent value="interactions" className="m-0 p-4">
            {loadingInteractions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : interactions.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No interactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Log a call, send WhatsApp, or record a voice note
                </p>
                <Button size="sm" className="mt-4" onClick={() => window.open('/dashboard/interactions')}>
                  Log Interaction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {interactions.map(i => (
                  <div key={i.id} className="flex gap-3 p-3 border rounded-lg bg-muted/20">
                    <span className="text-xl shrink-0">{getInteractionIcon(i.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">{i.type}</Badge>
                        <span className="text-muted-foreground">
                          {i.direction === 'inbound'
                            ? <ArrowDownLeft className="size-3 text-blue-500 inline" />
                            : <ArrowUpRight className="size-3 text-emerald-500 inline" />}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {(i.content_transcribed || i.content_raw) && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {i.content_transcribed || i.content_raw}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── COMPLIANCE TAB ── */}
          <TabsContent value="compliance" className="m-0 p-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="size-5" />
                    <span className="font-medium">GST Verification</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${gstStatus.color}`}>
                    <gstStatus.icon className="size-4" />
                    <span className="text-xs font-medium">{gstStatus.label}</span>
                  </div>
                </div>
                {lead.gstin ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">GSTIN</span>
                    <span className="text-sm font-mono">{lead.gstin}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="size-4" />
                    <span className="text-sm">GST number not provided</span>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => window.open('/dashboard/compliance')}
                >
                  {lead.gstin ? 'Update in Compliance' : 'Add GST/PAN →'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-5" />
                    <span className="font-medium">PAN Verification</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${panStatus.color}`}>
                    <panStatus.icon className="size-4" />
                    <span className="text-xs font-medium">{panStatus.label}</span>
                  </div>
                </div>
                {lead.pan_number ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">PAN Number</span>
                    <span className="text-sm font-mono">{lead.pan_number}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="size-4" />
                    <span className="text-sm">PAN number not provided</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Aadhaar eKYC</span>
                  {(lead as any).aadhaar_verified
                    ? <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                    : <Badge variant="outline">Not Verified</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bank Account (Penny Drop)</span>
                  {(lead as any).bank_verified
                    ? <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                    : <Badge variant="outline">Not Verified</Badge>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
