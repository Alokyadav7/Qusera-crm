'use client'

import { useState, useCallback } from 'react'
import {
  Phone, Mail, MessageSquare, MoreHorizontal, Eye, Pencil, Trash2,
  ArrowUpDown, CheckCircle2, XCircle, Clock, Loader2, UserCheck
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Lead } from '@/hooks/use-realtime-leads'

interface LeadsTableProps {
  leads: Lead[]
  onViewLead?: (lead: Lead) => void
  onEditLead?: (lead: Lead) => void
  onLeadsChanged?: () => void
}

function getSentimentLabel(score: number) {
  if (score >= 0.6) return 'Very Positive'
  if (score >= 0.3) return 'Positive'
  if (score >= -0.3) return 'Neutral'
  if (score >= -0.6) return 'Negative'
  return 'Very Negative'
}
function getSentimentColor(score: number) {
  if (score >= 0.6) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 0.3) return 'text-green-600 bg-green-50 border-green-200'
  if (score >= -0.3) return 'text-slate-600 bg-slate-50 border-slate-200'
  if (score >= -0.6) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-red-600 bg-red-50 border-red-200'
}
function getStatusColor(status: string) {
  const m: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-purple-50 text-purple-700 border-purple-200',
    interested: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    negotiation: 'bg-amber-50 text-amber-700 border-amber-200',
    closed_won: 'bg-green-50 text-green-700 border-green-200',
    closed_lost: 'bg-red-50 text-red-700 border-red-200',
  }
  return m[status] || 'bg-slate-50 text-slate-700 border-slate-200'
}
function formatINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}
function getComplianceIcon(status: string) {
  if (status === 'verified') return <CheckCircle2 className="size-4 text-emerald-500" />
  if (status === 'invalid') return <XCircle className="size-4 text-red-500" />
  return <Clock className="size-4 text-amber-500" />
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function getStatusLabel(status: string) {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function LeadsTable({ leads, onViewLead, onEditLead, onLeadsChanged }: LeadsTableProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)

  const toggleAll = () => setSelected(selected.length === leads.length && leads.length > 0 ? [] : leads.map(l => l.id))
  const toggleLead = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  // ── Real Supabase bulk delete ──
  const handleBulkDelete = useCallback(async () => {
    if (!selected.length) return
    setBulkLoading('delete')
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().in('id', selected)
    if (error) {
      toast.error('Failed to delete leads: ' + error.message)
    } else {
      toast.success(`${selected.length} lead(s) deleted`)
      setSelected([])
      onLeadsChanged?.()
    }
    setBulkLoading(null)
  }, [selected, onLeadsChanged])

  // ── Real WhatsApp API (Meta) for selected leads ──
  const handleBulkWhatsApp = useCallback(async () => {
    if (!selected.length) return
    setBulkLoading('whatsapp')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: leadData } = await supabase
      .from('leads')
      .select('id, full_name, phone_number')
      .in('id', selected)

    const phoneLeads = (leadData || []).filter(l => l.phone_number)
    const noPhone = (leadData || []).filter(l => !l.phone_number)

    let sent = 0
    for (const lead of phoneLeads) {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.phone_number,
          message: `Hi ${lead.full_name}, following up from OrbitCRM. How can we help you today?`,
          leadId: lead.id,
        }),
      })
      const data = await res.json()
      if (data.success) sent++
    }

    if (sent > 0) toast.success(`WhatsApp sent to ${sent} lead(s)${phoneLeads[0] && !process.env.NEXT_PUBLIC_META_CONFIGURED ? ' (mock mode)' : ''}`)
    if (noPhone.length) toast.info(`${noPhone.length} lead(s) skipped — no phone number`)
    if (user) await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).in('id', phoneLeads.map(l => l.id))
    setSelected([])
    onLeadsChanged?.()
    setBulkLoading(null)
  }, [selected, onLeadsChanged])

  // ── Real Email API (Resend) for selected leads ──
  const handleBulkEmail = useCallback(async () => {
    if (!selected.length) return
    setBulkLoading('email')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch lead emails for selected IDs
    const { data: leadData } = await supabase
      .from('leads')
      .select('id, full_name, email, phone_number')
      .in('id', selected)

    const emailLeads = (leadData || []).filter(l => l.email)
    const noEmail = (leadData || []).filter(l => !l.email)

    if (emailLeads.length > 0) {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailLeads.map(l => l.email),
          subject: 'Following up from OrbitCRM',
          html: `<p>Hi there,</p><p>We wanted to follow up with you. Please reply to this email if you have any questions.</p><p>Best regards,<br/>OrbitCRM Team</p>`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Email sent to ${emailLeads.length} lead(s)${data.mock ? ' (mock mode)' : ''}`)
        if (noEmail.length) toast.info(`${noEmail.length} lead(s) skipped — no email address`)
        // Log interactions
        if (user) {
          await supabase.from('interactions').insert(
            emailLeads.map(l => ({ user_id: user.id, lead_id: l.id, type: 'email', direction: 'outbound', content_raw: 'Bulk email sent', created_at: new Date().toISOString() }))
          )
          await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).in('id', emailLeads.map(l => l.id))
        }
      } else toast.error('Email failed: ' + data.error)
    } else {
      toast.warning('None of the selected leads have email addresses')
    }
    setSelected([])
    onLeadsChanged?.()
    setBulkLoading(null)
  }, [selected, onLeadsChanged])

  // ── Mark as contacted ──
  const handleBulkAssign = useCallback(async () => {
    if (!selected.length) return
    setBulkLoading('assign')
    const supabase = createClient()
    const { error } = await supabase.from('leads')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .in('id', selected)
    if (error) toast.error('Failed to update: ' + error.message)
    else {
      toast.success(`${selected.length} lead(s) marked as Contacted`)
      setSelected([])
      onLeadsChanged?.()
    }
    setBulkLoading(null)
  }, [selected, onLeadsChanged])

  // ── Single lead delete ──
  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) toast.error('Failed to delete: ' + error.message)
    else { toast.success('Lead deleted'); onLeadsChanged?.() }
  }, [onLeadsChanged])

  // ── Log single interaction ──
  const logInteraction = useCallback(async (leadId: string, type: 'whatsapp' | 'call' | 'email') => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('interactions').insert({
      user_id: user.id, lead_id: leadId, type,
      direction: 'outbound', content_raw: `${type} initiated from Leads page`,
      created_at: new Date().toISOString(),
    })
    await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', leadId)
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged`)
    onLeadsChanged?.()
  }, [onLeadsChanged])

  return (
    <div className="space-y-4">
      {/* Bulk Actions — real Supabase ops */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg flex-wrap">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button variant="outline" size="sm" disabled={bulkLoading === 'email'} onClick={handleBulkEmail}>
              {bulkLoading === 'email' ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Mail className="size-4 mr-1" />}
              Bulk Email
            </Button>
            <Button variant="outline" size="sm" disabled={bulkLoading === 'whatsapp'} onClick={handleBulkWhatsApp}>
              {bulkLoading === 'whatsapp' ? <Loader2 className="size-4 mr-1 animate-spin" /> : <MessageSquare className="size-4 mr-1" />}
              Bulk WhatsApp
            </Button>
            <Button variant="outline" size="sm" disabled={bulkLoading === 'assign'} onClick={handleBulkAssign}>
              {bulkLoading === 'assign' ? <Loader2 className="size-4 mr-1 animate-spin" /> : <UserCheck className="size-4 mr-1" />}
              Mark Contacted
            </Button>
            <Button variant="destructive" size="sm" disabled={bulkLoading === 'delete'} onClick={handleBulkDelete}>
              {bulkLoading === 'delete' ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Trash2 className="size-4 mr-1" />}
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/50 glass-card shadow-sm shadow-primary/5 overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selected.length === leads.length && leads.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead><Button variant="ghost" size="sm" className="-ml-3">Lead <ArrowUpDown className="size-3 ml-1" /></Button></TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map(lead => (
              <TableRow key={lead.id} className="group">
                <TableCell><Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggleLead(lead.id)} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(lead.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.company || lead.phone_number || lead.email || '—'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className={getStatusColor(lead.status)}>{getStatusLabel(lead.status)}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={getSentimentColor(lead.sentiment_score)}>{getSentimentLabel(lead.sentiment_score)}</Badge></TableCell>
                <TableCell><Badge variant={lead.buying_intent === 'high' ? 'default' : 'secondary'}>{lead.buying_intent}</Badge></TableCell>
                <TableCell>
                  {lead.estimated_budget
                    ? <span className="font-medium text-emerald-600">{formatINR(lead.estimated_budget)}</span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">{getComplianceIcon(lead.gst_status)}<span className="text-xs">GST</span></div>
                    <div className="flex items-center gap-1">{getComplianceIcon(lead.pan_status)}<span className="text-xs">PAN</span></div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {lead.last_contacted_at ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true }) : 'Never'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => logInteraction(lead.id, 'call')}>
                      <Phone className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => logInteraction(lead.id, 'whatsapp')}>
                      <MessageSquare className="size-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onViewLead?.(lead)}><Eye className="size-4 mr-2" />View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditLead?.(lead)}><Pencil className="size-4 mr-2" />Edit Lead</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logInteraction(lead.id, 'call')}><Phone className="size-4 mr-2" />Log Call</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => logInteraction(lead.id, 'whatsapp')}><MessageSquare className="size-4 mr-2" />Log WhatsApp</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => logInteraction(lead.id, 'email')}><Mail className="size-4 mr-2" />Log Email</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(lead.id)}>
                          <Trash2 className="size-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
