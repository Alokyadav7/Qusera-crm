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
import { Plus, Search, Building2, Globe, MapPin, FileCheck, Edit3, Trash2 } from 'lucide-react'

export interface Account {
  id: string
  company_id: string
  name: string
  industry: string | null
  website: string | null
  gst_number: string | null
  pan_number: string | null
  city: string | null
  state: string | null
  assigned_to: string | null
  created_at: string
}

const INDUSTRIES = ['SaaS / Software','Real Estate','Manufacturing','Retail','Finance / BFSI','Healthcare','Education','Consulting','Other']

export function AccountsPageClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editAcc, setEditAcc] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', website: '', gst_number: '', pan_number: '', city: '', state: '' })

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('accounts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, payload => {
        if (payload.eventType === 'INSERT') setAccounts(p => [payload.new as Account, ...p])
        else if (payload.eventType === 'UPDATE') setAccounts(p => p.map(a => a.id === (payload.new as Account).id ? payload.new as Account : a))
        else if (payload.eventType === 'DELETE') setAccounts(p => p.filter(a => a.id !== (payload.old as any).id))
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const reset = () => setForm({ name: '', industry: '', website: '', gst_number: '', pan_number: '', city: '', state: '' })

  const openEdit = (a: Account) => {
    setEditAcc(a)
    setForm({ name: a.name, industry: a.industry ?? '', website: a.website ?? '', gst_number: a.gst_number ?? '', pan_number: a.pan_number ?? '', city: a.city ?? '', state: a.state ?? '' })
    setAddOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const supabase = createClient()
    const payload = { name: form.name, industry: form.industry || null, website: form.website || null, gst_number: form.gst_number || null, pan_number: form.pan_number || null, city: form.city || null, state: form.state || null }
    try {
      if (editAcc) {
        await (supabase as any).from('accounts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editAcc.id)
        toast.success('Account updated')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()
        await (supabase as any).from('accounts').insert({ ...payload, company_id: uac.data.company_id, created_by: user!.id })
        toast.success('Account added')
      }
      setAddOpen(false); setEditAcc(null); reset()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return
    await (createClient() as any).from('accounts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setAccounts(p => p.filter(a => a.id !== id))
    toast.success('Account deleted')
  }

  const filtered = accounts.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.industry?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Accounts" subtitle={`${accounts.length} B2B company accounts`} />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search accounts..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { reset(); setEditAcc(null); setAddOpen(true) }}><Plus className="size-4 mr-1" /> Add Account</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-muted/20">
            <Building2 className="size-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No accounts yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Add B2B company accounts — link contacts and deals to them.</p>
            <Button size="sm" onClick={() => { reset(); setEditAcc(null); setAddOpen(true) }}><Plus className="size-4 mr-1" /> Add First Account</Button>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>{['Company','Industry','Location','GST','PAN','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="size-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{a.name}</p>
                          {a.website && <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"><Globe className="size-3" />{a.website.replace(/^https?:\/\//, '')}</a>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{a.industry ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(a.city || a.state) ? <span className="flex items-center gap-1"><MapPin className="size-3" />{[a.city, a.state].filter(Boolean).join(', ')}</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.gst_number ? <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{a.gst_number}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a.pan_number ? <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{a.pan_number}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Edit3 className="size-3.5" /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="size-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setEditAcc(null); reset() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editAcc ? 'Edit Account' : 'Add Account'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5"><Label>Company Name *</Label><Input placeholder="Acme Corporation" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Industry</Label>
                <Select value={form.industry} onValueChange={v => setForm(p=>({...p,industry:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label>Website</Label><Input placeholder="https://acme.com" value={form.website} onChange={e => setForm(p=>({...p,website:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>GST Number</Label><Input placeholder="29ABCDE1234F1Z5" value={form.gst_number} onChange={e => setForm(p=>({...p,gst_number:e.target.value.toUpperCase()}))} className="font-mono" /></div>
              <div className="grid gap-1.5"><Label>PAN Number</Label><Input placeholder="ABCDE1234F" value={form.pan_number} onChange={e => setForm(p=>({...p,pan_number:e.target.value.toUpperCase()}))} className="font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>City</Label><Input placeholder="Mumbai" value={form.city} onChange={e => setForm(p=>({...p,city:e.target.value}))} /></div>
              <div className="grid gap-1.5"><Label>State</Label><Input placeholder="Maharashtra" value={form.state} onChange={e => setForm(p=>({...p,state:e.target.value}))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditAcc(null); reset() }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editAcc ? 'Update' : 'Add Account')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
