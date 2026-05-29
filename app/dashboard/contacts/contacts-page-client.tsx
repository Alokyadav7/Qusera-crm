'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus, Search, Mail, Phone, Building2, Tag, User,
  Briefcase, Trash2, Edit3, Users
} from 'lucide-react'

export interface Contact {
  id: string
  company_id: string
  full_name: string
  email: string | null
  phone: string | null
  company_name: string | null
  designation: string | null
  source: string | null
  tags: string[]
  assigned_to: string | null
  created_at: string
}

export function ContactsPageClient({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', company_name: '',
    designation: '', source: 'manual', tags: '',
  })

  // ── Fetch + Realtime ──────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    // Client-side refresh covers RLS-blocked server renders
    ;(supabase as any).from('contacts').select('*').is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Contact[] | null }) => {
        if (data && data.length > 0) setContacts(data)
      })

    const channel = supabase
      .channel('contacts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, payload => {
        if (payload.eventType === 'INSERT') {
          setContacts(prev => [payload.new as Contact, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setContacts(prev => prev.map(c => c.id === (payload.new as Contact).id ? payload.new as Contact : c))
        } else if (payload.eventType === 'DELETE') {
          setContacts(prev => prev.filter(c => c.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const resetForm = () => setForm({ full_name: '', email: '', phone: '', company_name: '', designation: '', source: 'manual', tags: '' })

  const openEdit = (c: Contact) => {
    setEditContact(c)
    setForm({
      full_name: c.full_name, email: c.email ?? '', phone: c.phone ?? '',
      company_name: c.company_name ?? '', designation: c.designation ?? '',
      source: c.source ?? 'manual', tags: (c.tags ?? []).join(', '),
    })
    setAddOpen(true)
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      company_name: form.company_name || null,
      designation: form.designation || null,
      source: form.source,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }
    try {
      if (editContact) {
        const { error } = await (supabase as any).from('contacts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editContact.id)
        if (error) throw error
        toast.success('Contact updated')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()
        const companyId = uac?.data?.company_id ?? null
        const { error } = await (supabase as any).from('contacts').insert({ ...payload, company_id: companyId, created_by: user!.id })
        if (error) throw error
        toast.success('Contact added')
      }
      setAddOpen(false)
      setEditContact(null)
      resetForm()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    const supabase = createClient()
    await (supabase as any).from('contacts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    toast.success('Contact deleted')
  }

  const filtered = contacts.filter(c =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Contacts" subtitle={`${contacts.length} contacts · People separate from leads`} />
      <main className="flex-1 p-4 md:p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { resetForm(); setEditContact(null); setAddOpen(true) }}>
            <Plus className="size-4 mr-1" /> Add Contact
          </Button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-muted/20">
            <Users className="size-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No contacts yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Add contacts — people separate from your lead opportunities.</p>
            <Button size="sm" onClick={() => { resetForm(); setEditContact(null); setAddOpen(true) }}>
              <Plus className="size-4 mr-1" /> Add First Contact
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(c => (
              <div key={c.id} className="group relative bg-card border rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/20">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {c.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.full_name}</p>
                    {c.designation && <p className="text-xs text-muted-foreground truncate">{c.designation}</p>}
                    {c.company_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building2 className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">{c.company_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="size-3" /> <span className="truncate">{c.email}</span>
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="size-3" /> <span>{c.phone}</span>
                    </a>
                  )}
                </div>
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {c.tags.slice(0,3).map(t => (
                      <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">{t}</Badge>
                    ))}
                    {c.tags.length > 3 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{c.tags.length - 3}</Badge>}
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-md bg-background border hover:bg-muted transition-colors">
                    <Edit3 className="size-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md bg-background border hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between">
                  <Badge variant="outline" className="text-xs capitalize">{c.source ?? 'manual'}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setEditContact(null); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="Jane Smith" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 98765..." value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Company</Label>
                <Input placeholder="Acme Inc." value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Designation</Label>
                <Input placeholder="CTO" value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['manual','website','referral','linkedin','cold_call','event','other'].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g,' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="vip, enterprise, hot" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditContact(null); resetForm() }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editContact ? 'Update' : 'Add Contact')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
