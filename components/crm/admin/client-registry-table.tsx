'use client'

import { useState, useCallback } from 'react'
import { Building2, Plus, Phone, Mail, MapPin, Search, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Client, ClientContact } from '@/lib/types/client'

const STATUS_COLORS: Record<string, string> = {
  new:         'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200',
  contacted:   'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200',
  interested:  'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 border-cyan-200',
  verified:    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200',
  negotiation: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200',
  closed_won:  'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200',
  closed_lost: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200',
}

function formatINR(v: number | null | undefined) {
  if (!v) return '—'
  return v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr`
    : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L`
    : `₹${(v / 1000).toFixed(0)}K`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface ClientWithRelations extends Client {
  contacts: ClientContact[]
  addresses: any[]
}

interface Props {
  clients: ClientWithRelations[]
  onRefresh: () => void
}

function AddClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', industry: '', website: '', source: 'manual', status: 'new',
    buying_intent: 'medium', estimated_budget: '',
    // primary contact
    contact_name: '', contact_phone: '', contact_email: '', contact_designation: '',
    // address
    city: '', state: '', pincode: '', address_line1: '',
  })

  const handleCreate = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Insert client
      const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: form.name,
          industry: form.industry || null,
          website: form.website || null,
          source: form.source,
          status: form.status,
          buying_intent: form.buying_intent,
          estimated_budget: form.estimated_budget ? Number(form.estimated_budget) : null,
          gst_status: 'pending',
          pan_status: 'pending',
          sentiment_score: 0,
        })
        .select()
        .single()
      if (cErr) throw cErr

      // 2. Insert primary contact if provided
      if (form.contact_name && client) {
        const { data: contact } = await supabase.from('client_contacts').insert({
          client_id: client.id,
          full_name: form.contact_name,
          phone_number: form.contact_phone || null,
          email: form.contact_email || null,
          designation: form.contact_designation || null,
          is_primary: true,
        }).select().single()

        // 3. Insert address if provided
        if (contact && (form.city || form.address_line1)) {
          await supabase.from('client_addresses').insert({
            client_id: client.id,
            client_contact_id: contact.id,
            address_type: 'billing',
            address_line1: form.address_line1 || null,
            city: form.city || null,
            state: form.state || null,
            pincode: form.pincode || null,
            is_primary: true,
          })
        }
      }

      toast.success(`Client "${form.name}" created!`)
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error('Failed to create client: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Add New Client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Client Info */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Company Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Company Name *</Label>
                <Input placeholder="TechCorp India" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Industry</Label>
                <Input placeholder="Technology" value={form.industry} onChange={e => set('industry', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Website</Label>
                <Input placeholder="https://techcorp.in" value={form.website} onChange={e => set('website', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Select value={form.source} onValueChange={v => set('source', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['manual','referral','website','cold_call','whatsapp','voice'].map(s => (
                      <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['new','contacted','interested','verified','negotiation','closed_won','closed_lost'].map(s => (
                      <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Buying Intent</Label>
                <Select value={form.buying_intent} onValueChange={v => set('buying_intent', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high" className="text-xs">🔥 High</SelectItem>
                    <SelectItem value="medium" className="text-xs">⚡ Medium</SelectItem>
                    <SelectItem value="low" className="text-xs">❄️ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Est. Budget (₹)</Label>
                <Input type="number" placeholder="500000" value={form.estimated_budget} onChange={e => set('estimated_budget', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Primary Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Full Name</Label>
                <Input placeholder="Rajesh Mehta" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input placeholder="+91 98765 43210" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="rajesh@techcorp.in" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Designation</Label>
                <Input placeholder="CEO / Procurement Manager" value={form.contact_designation} onChange={e => set('contact_designation', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Billing Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Address Line 1</Label>
                <Input placeholder="123, MG Road" value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input placeholder="Mumbai" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State</Label>
                <Input placeholder="Maharashtra" value={form.state} onChange={e => set('state', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pincode</Label>
                <Input placeholder="400001" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.name || saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
            Create Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ClientRegistryTable({ clients, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this client and all their contacts and addresses?')) return
    setDeleting(id)
    const supabase = createClient()
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) toast.error('Failed to delete: ' + error.message)
    else { toast.success('Client deleted'); onRefresh() }
    setDeleting(null)
  }, [onRefresh])

  return (
    <>
      <AddClientModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={onRefresh} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-4" /> Client Registry
              </CardTitle>
              <CardDescription>Companies managed in your CRM — with contacts and addresses</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="size-4" /> Add Client
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map(client => {
              const isExpanded = expanded === client.id
              const primaryContact = client.contacts?.find(c => c.is_primary) ?? client.contacts?.[0]
              const primaryAddress = client.addresses?.find(a => a.is_primary) ?? client.addresses?.[0]

              return (
                <div key={client.id} className="hover:bg-muted/20 transition-colors">
                  {/* Client row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{client.name}</p>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[client.status] ?? ''}`}>
                          {client.status.replace('_', ' ')}
                        </Badge>
                        {client.industry && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{client.industry}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {primaryContact && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="size-3" /> {primaryContact.phone_number || primaryContact.email || primaryContact.full_name}
                          </span>
                        )}
                        {primaryAddress?.city && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-3" /> {[primaryAddress.city, primaryAddress.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="text-xs font-medium text-emerald-600">{formatINR(client.deal_value ?? client.estimated_budget)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {client.contacts?.length ?? 0} contact{client.contacts?.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="ghost" size="icon" className="size-8"
                        onClick={() => setExpanded(isExpanded ? null : client.id)}
                      >
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(client.id)}
                        disabled={deleting === client.id}
                      >
                        {deleting === client.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded: contacts + addresses */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-muted/10 grid sm:grid-cols-2 gap-4">
                      {/* Contacts */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contacts</p>
                        <div className="space-y-2">
                          {(client.contacts ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No contacts yet</p>
                          ) : (
                            (client.contacts ?? []).map(c => (
                              <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg bg-card border border-border/50">
                                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-primary">{c.full_name[0]}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium">{c.full_name} {c.is_primary && <span className="text-[10px] text-primary">(Primary)</span>}</p>
                                  {c.designation && <p className="text-[10px] text-muted-foreground">{c.designation}</p>}
                                  <div className="flex flex-wrap gap-2 mt-0.5">
                                    {c.phone_number && (
                                      <a href={`tel:${c.phone_number}`} className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                                        <Phone className="size-2.5" />{c.phone_number}
                                      </a>
                                    )}
                                    {c.email && (
                                      <a href={`mailto:${c.email}`} className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                                        <Mail className="size-2.5" />{c.email}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      {/* Addresses */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Addresses</p>
                        <div className="space-y-2">
                          {(client.addresses ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No addresses yet</p>
                          ) : (
                            (client.addresses ?? []).map((a: any) => (
                              <div key={a.id} className="p-2 rounded-lg bg-card border border-border/50 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-[10px] capitalize">{a.address_type}</Badge>
                                  {a.is_primary && <span className="text-[10px] text-primary">Primary</span>}
                                </div>
                                <p className="text-muted-foreground">
                                  {[a.address_line1, a.address_line2, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', ')}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Building2 className="size-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {clients.length === 0 ? 'No clients yet — add your first one!' : 'No clients match your search'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
