'use client'

import { useState, useCallback } from 'react'
import {
  FileCheck, CheckCircle2, XCircle, Clock, Search,
  Download, RefreshCw, AlertTriangle, Building2, CreditCard,
  FileText, BadgeCheck, ChevronDown, Loader2, Pencil, Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import type { Lead } from '@/hooks/use-realtime-leads'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type DocStatus = 'verified' | 'pending' | 'invalid'

// ── Validators ──────────────────────────────────────────────────────────────
function validateGSTIN(v: string) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase())
}
function validatePAN(v: string) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase())
}

function statusBadge(status: string) {
  if (status === 'verified') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified</Badge>
  if (status === 'invalid') return <Badge className="bg-red-50 text-red-700 border-red-200">Invalid</Badge>
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
}
function docIcon(type: string) {
  if (type === 'gstin') return <Building2 className="size-4" />
  if (type === 'pan') return <CreditCard className="size-4" />
  if (type === 'aadhaar') return <BadgeCheck className="size-4" />
  return <FileText className="size-4" />
}
function docLabel(type: string) {
  const m: Record<string, string> = { gstin: 'GST Certificate', pan: 'PAN Card', aadhaar: 'Aadhaar', bank: 'Bank Account' }
  return m[type] || type
}

// ── Edit Dialog ──────────────────────────────────────────────────────────────
interface EditDialogProps {
  lead: Lead | null
  onClose: () => void
  onSaved: () => void
}

function EditComplianceDialog({ lead, onClose, onSaved }: EditDialogProps) {
  const [gstin, setGstin] = useState((lead as any)?.gstin || '')
  const [pan, setPan] = useState((lead as any)?.pan_number || '')
  const [gstStatus, setGstStatus] = useState<DocStatus>((lead as any)?.gst_status || 'pending')
  const [panStatus, setPanStatus] = useState<DocStatus>((lead as any)?.pan_status || 'pending')
  const [saving, setSaving] = useState(false)

  const gstValid = !gstin || validateGSTIN(gstin)
  const panValid = !pan || validatePAN(pan)

  const handleSave = async () => {
    if (!lead) return
    if (gstin && !gstValid) { toast.error('Invalid GSTIN format (e.g. 27AABCU9603R1ZX)'); return }
    if (pan && !panValid) { toast.error('Invalid PAN format (e.g. AABCU9603R)'); return }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({
      gstin: gstin.toUpperCase() || null,
      pan_number: pan.toUpperCase() || null,
      gst_status: gstin ? gstStatus : null,
      pan_status: pan ? panStatus : null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    if (error) toast.error(error.message)
    else { toast.success('Compliance data saved!'); onSaved() }
    setSaving(false)
  }

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="size-5 text-primary" />
            Edit Compliance — {lead?.full_name}
          </DialogTitle>
          <DialogDescription>
            Enter GST and PAN details for this lead. Numbers are validated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* GSTIN */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="size-4 text-blue-600" /> GSTIN (15 digits)
            </Label>
            <Input
              placeholder="e.g. 27AABCU9603R1ZX"
              value={gstin}
              onChange={e => setGstin(e.target.value.toUpperCase())}
              className={gstin && !gstValid ? 'border-red-400 focus-visible:ring-red-400' : ''}
              maxLength={15}
            />
            {gstin && (
              <div className={`text-xs flex items-center gap-1 ${gstValid ? 'text-emerald-600' : 'text-red-500'}`}>
                {gstValid ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                {gstValid ? 'Valid GSTIN format' : 'Format: 27AABCU9603R1ZX (15 chars)'}
              </div>
            )}
            {gstin && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">GST Status</Label>
                <Select value={gstStatus} onValueChange={v => setGstStatus(v as DocStatus)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Pending Review</SelectItem>
                    <SelectItem value="verified">✅ Verified</SelectItem>
                    <SelectItem value="invalid">❌ Invalid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* PAN */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="size-4 text-purple-600" /> PAN Number (10 chars)
            </Label>
            <Input
              placeholder="e.g. AABCU9603R"
              value={pan}
              onChange={e => setPan(e.target.value.toUpperCase())}
              className={pan && !panValid ? 'border-red-400 focus-visible:ring-red-400' : ''}
              maxLength={10}
            />
            {pan && (
              <div className={`text-xs flex items-center gap-1 ${panValid ? 'text-emerald-600' : 'text-red-500'}`}>
                {panValid ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                {panValid ? 'Valid PAN format' : 'Format: AABCU9603R (5 letters, 4 digits, 1 letter)'}
              </div>
            )}
            {pan && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">PAN Status</Label>
                <Select value={panStatus} onValueChange={v => setPanStatus(v as DocStatus)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Pending Review</SelectItem>
                    <SelectItem value="verified">✅ Verified</SelectItem>
                    <SelectItem value="invalid">❌ Invalid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">💡 How to verify</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Enter the number, then set status to "Verified" once confirmed</li>
              <li>GSTIN can be verified at <strong>gstin.gov.in</strong></li>
              <li>PAN can be verified at <strong>incometax.gov.in</strong></li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (!!gstin && !gstValid) || (!!pan && !panValid)}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CompliancePage() {
  const { leads, isLoading, refetch } = useRealtimeLeads()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)

  const allDocs = leads.flatMap(lead => {
    const docs: any[] = []
    if ((lead as any).gstin !== undefined || (lead as any).gst_status) {
      docs.push({
        id: `${lead.id}-gst`, leadId: lead.id, leadName: lead.full_name,
        company: lead.company || '—', documentType: 'gstin',
        documentNumber: (lead as any).gstin || '',
        status: ((lead as any).gst_status || 'pending') as DocStatus,
        uploadedAt: lead.created_at, lead,
      })
    }
    if ((lead as any).pan_number !== undefined || (lead as any).pan_status) {
      docs.push({
        id: `${lead.id}-pan`, leadId: lead.id, leadName: lead.full_name,
        company: lead.company || '—', documentType: 'pan',
        documentNumber: (lead as any).pan_number || '',
        status: ((lead as any).pan_status || 'pending') as DocStatus,
        uploadedAt: lead.created_at, lead,
      })
    }
    return docs
  })

  const filteredDocs = allDocs.filter(doc => {
    const matchSearch = doc.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || doc.status === statusFilter
    const matchType = typeFilter === 'all' || doc.documentType === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const stats = {
    total: allDocs.length,
    verified: allDocs.filter(d => d.status === 'verified').length,
    pending: allDocs.filter(d => d.status === 'pending').length,
    invalid: allDocs.filter(d => d.status === 'invalid').length,
  }
  const verificationRate = stats.total ? Math.round((stats.verified / stats.total) * 100) : 0

  const updateDocStatus = useCallback(async (leadId: string, field: string, newStatus: DocStatus) => {
    setUpdating(`${leadId}-${field}`)
    const supabase = createClient()
    const { error } = await supabase.from('leads')
      .update({ [field]: newStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId)
    if (error) toast.error('Update failed: ' + error.message)
    else { toast.success('Status updated'); refetch() }
    setUpdating(null)
  }, [refetch])

  const leadSummary = leads.map(lead => ({
    id: lead.id, lead,
    fullName: lead.full_name,
    company: lead.company || '—',
    gstin: (lead as any).gstin || '',
    pan: (lead as any).pan_number || '',
    gstStatus: (lead as any).gst_status || 'pending',
    panStatus: (lead as any).pan_status || 'pending',
  }))

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Edit Dialog */}
      <EditComplianceDialog
        lead={editLead}
        onClose={() => setEditLead(null)}
        onSaved={() => { refetch(); setEditLead(null) }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Verification</h1>
          <p className="text-muted-foreground">
            GST, PAN verification · {leads.length} leads · Click ✏️ on any lead to add numbers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
            <span className="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />Live
          </Badge>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="size-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Total Docs', value: stats.total, icon: <FileCheck className="size-4 text-muted-foreground" /> },
          { label: 'Verified', value: stats.verified, icon: <CheckCircle2 className="size-4 text-emerald-600" />, color: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, icon: <Clock className="size-4 text-amber-600" />, color: 'text-amber-600' },
          { label: 'Invalid', value: stats.invalid, icon: <XCircle className="size-4 text-red-600" />, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(s as any).color || ''}`}>{s.value}</div>
              {s.label === 'Verified' && <Progress value={verificationRate} className="mt-2 h-1" />}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">All Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({allDocs.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
        </TabsList>

        {/* ── ALL LEADS TAB (primary — shows how to add) ── */}
        <TabsContent value="leads" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search leads…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          {leads.length === 0 ? (
            <div className="py-16 text-center border rounded-lg bg-muted/20">
              <FileCheck className="mx-auto size-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No leads yet — add leads first from the Leads page.</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead / Company</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead>GST Status</TableHead>
                      <TableHead>PAN</TableHead>
                      <TableHead>PAN Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadSummary
                      .filter(l => !searchQuery ||
                        l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        l.company.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {lead.fullName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{lead.fullName}</div>
                                <div className="text-xs text-muted-foreground">{lead.company}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.gstin
                              ? <code className="text-xs bg-muted px-2 py-0.5 rounded">{lead.gstin}</code>
                              : <span className="text-xs text-muted-foreground italic">Not added</span>}
                          </TableCell>
                          <TableCell>{statusBadge(lead.gstStatus)}</TableCell>
                          <TableCell>
                            {lead.pan
                              ? <code className="text-xs bg-muted px-2 py-0.5 rounded">{lead.pan}</code>
                              : <span className="text-xs text-muted-foreground italic">Not added</span>}
                          </TableCell>
                          <TableCell>{statusBadge(lead.panStatus)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={lead.gstin || lead.pan ? 'outline' : 'default'}
                              onClick={() => setEditLead(lead.lead)}
                            >
                              {lead.gstin || lead.pan
                                ? <><Pencil className="size-3 mr-1" />Edit</>
                                : <><Plus className="size-3 mr-1" />Add</>}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── DOCUMENTS TAB ── */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search by name, number…" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Status <ChevronDown className="ml-2 size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {['all','verified','pending','invalid'].map(s => (
                  <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Type <ChevronDown className="ml-2 size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {['all','gstin','pan'].map(t => (
                  <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)}>
                    {t === 'all' ? 'All Types' : docLabel(t)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="py-16 text-center border rounded-lg bg-muted/20">
              <FileCheck className="mx-auto size-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No documents yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Go to "All Leads" tab and click <strong>Add</strong> on any lead.</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead / Company</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {doc.leadName.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{doc.leadName}</div>
                              <div className="text-xs text-muted-foreground">{doc.company}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">{docIcon(doc.documentType)}<span>{docLabel(doc.documentType)}</span></div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{doc.documentNumber || 'Not provided'}</code>
                        </TableCell>
                        <TableCell>{statusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditLead(doc.lead)}>
                              <Pencil className="size-3 mr-1" />Edit
                            </Button>
                            {doc.status === 'pending' && (
                              <Button size="sm" variant="outline"
                                disabled={updating === doc.id}
                                onClick={() => updateDocStatus(doc.leadId, doc.documentType === 'gstin' ? 'gst_status' : 'pan_status', 'verified')}>
                                {updating === doc.id ? <Loader2 className="size-3 animate-spin" /> : 'Verify'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── PENDING TAB ── */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
              <CardDescription>Documents awaiting verification</CardDescription>
            </CardHeader>
            <CardContent>
              {allDocs.filter(d => d.status === 'pending').length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto size-10 text-emerald-500/50 mb-3" />
                  All documents verified!
                </div>
              ) : (
                <div className="space-y-4">
                  {allDocs.filter(d => d.status === 'pending').map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          {docIcon(doc.documentType)}
                        </div>
                        <div>
                          <div className="font-medium">{doc.leadName}</div>
                          <div className="text-sm text-muted-foreground">
                            {docLabel(doc.documentType)} — {doc.documentNumber || 'Number not entered yet'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditLead(doc.lead)}>
                          <Pencil className="size-3 mr-1" />Edit
                        </Button>
                        <Button size="sm"
                          disabled={!doc.documentNumber || updating !== null}
                          onClick={() => updateDocStatus(doc.leadId, doc.documentType === 'gstin' ? 'gst_status' : 'pan_status', 'verified')}>
                          {updating === doc.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                          Verify Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
