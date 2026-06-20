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
import { FileText, Plus, Search, Eye, Printer, Send, Trash2, IndianRupee, Trash, Percent } from 'lucide-react'

export interface Invoice {
  id: string
  number: string
  contact_id: string | null
  deal_id: string | null
  line_items: any[]
  subtotal: number
  tax_percent: number
  total: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  due_date: string | null
  created_at: string
  contact?: { full_name: string; email: string | null } | null
}

export function InvoicesPageClient({
  initialInvoices,
  contacts: initialContacts,
  deals: initialDeals
}: {
  initialInvoices: Invoice[]
  contacts: any[]
  deals: any[]
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)

  // Form States
  const [number, setNumber] = useState('')
  const [contactId, setContactId] = useState('')
  const [dealId, setDealId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [taxPercent, setTaxPercent] = useState(18)
  const [lineItems, setLineItems] = useState<{ desc: string; qty: number; rate: number }[]>([
    { desc: '', qty: 1, rate: 0 }
  ])

  const [contacts, setContacts] = useState<any[]>(initialContacts)
  const [deals, setDeals] = useState<any[]>(initialDeals)

  // Client-side fetch — covers RLS-blocked server renders
  useEffect(() => {
    const supabase = createClient()
    // Load invoices
    ;(supabase as any).from('crm_invoices')
      .select('*, contact:contacts(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Invoice[] | null }) => { if (data) setInvoices(data) })
    // Load contacts for dropdown
    supabase.from('contacts').select('id, full_name, email').is('deleted_at', null as any)
      .then(({ data }) => { if (data?.length) setContacts(data) })
    // Load deals for dropdown
    ;(supabase as any).from('deals').select('id, title')
      .then(({ data }: { data: any[] | null }) => { if (data?.length) setDeals(data) })

    // Realtime
    const channel = supabase
      .channel('crm-invoices-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_invoices' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newInv = payload.new as Invoice
          if (newInv.contact_id) {
            const { data } = await supabase.from('contacts').select('full_name, email').eq('id', newInv.contact_id).single()
            if (data) newInv.contact = data as any
          }
          setInvoices(prev => [newInv, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setInvoices(prev => prev.map(inv => inv.id === payload.new.id ? { ...inv, ...payload.new as Invoice } : inv))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const addLineItem = () => {
    setLineItems(prev => [...prev, { desc: '', qty: 1, rate: 0 }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: string, value: any) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return { ...item, [field]: value }
    }))
  }

  // Calculate totals
  const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0)
  const total = subtotal + (subtotal * taxPercent / 100)

  const handleSave = async () => {
    if (!number.trim() || !contactId) {
      toast.error('Invoice Number and Contact are required')
      return
    }
    setSaving(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()

      const companyId = uac?.data?.company_id ?? null
      const { error } = await (supabase as any).from('crm_invoices').insert({
        company_id: companyId,
        contact_id: contactId,
        deal_id: dealId || null,
        number: number.trim(),
        line_items: lineItems,
        subtotal,
        tax_percent: taxPercent,
        total,
        status: 'draft',
        due_date: dueDate || null,
        created_by: user!.id
      })

      if (error) throw error
      toast.success('Invoice drafted successfully')
      setAddOpen(false)
      setNumber('')
      setLineItems([{ desc: '', qty: 1, rate: 0 }])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, newStatus: any) => {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('crm_invoices')
      .update({ status: newStatus })
      .eq('id', id)
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Invoice status updated to ${newStatus}`)
      if (viewInvoice?.id === id) {
        setViewInvoice(prev => prev ? { ...prev, status: newStatus } : null)
      }
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const filtered = invoices.filter(inv => 
    !search || 
    inv.number.toLowerCase().includes(search.toLowerCase()) ||
    inv.contact?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen print:p-0">
      <div className="print:hidden">
        <CRMHeader title="Invoices & Proposals" subtitle="Generate billing proposals, track status flows, and issue invoices" />
      </div>
      
      <main className="flex-1 p-4 md:p-6 space-y-4 print:p-0 print:m-0">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between print:hidden">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search invoice number or client name..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-1" /> New Invoice
          </Button>
        </div>

        {/* Invoice Grid/Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-muted/20 print:hidden">
            <FileText className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No invoices yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Create professional proposals or invoices for your customers and print or share them via email.
            </p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card text-sm print:hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {['Invoice Number', 'Client Name', 'Subtotal', 'Tax (GST)', 'Total Amount', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold">{inv.number}</td>
                    <td className="px-4 py-3 font-medium">{inv.contact?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono">₹{inv.subtotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.tax_percent}%</td>
                    <td className="px-4 py-3 font-semibold font-mono">₹{inv.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'draft' ? 'secondary' : 'outline'} className="capitalize">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setViewInvoice(inv)}>
                          <Eye className="size-3.5 mr-1" /> View
                        </Button>
                        <select
                          className="h-7 rounded border bg-background px-1.5 py-0.5 text-xs focus-visible:outline-none"
                          value={inv.status}
                          onChange={e => updateStatus(inv.id, e.target.value)}
                        >
                          {['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'].map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Invoice Details Print View Dialog */}
      <Dialog open={viewInvoice !== null} onOpenChange={v => { if (!v) setViewInvoice(null) }}>
        <DialogContent className="sm:max-w-3xl overflow-y-auto max-h-[90vh]">
          {viewInvoice && (
            <div className="space-y-6 p-4">
              {/* Header Actions */}
              <div className="flex justify-between items-center border-b pb-4 print:hidden">
                <h3 className="font-semibold text-lg">Invoice Overview</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="size-4 mr-1.5" /> Print / PDF
                  </Button>
                  <Button size="sm" onClick={() => updateStatus(viewInvoice.id, 'sent')}>
                    <Send className="size-4 mr-1.5" /> Send to Client
                  </Button>
                </div>
              </div>

              {/* Printable Invoice Page */}
              <div className="bg-white text-black p-6 rounded-lg space-y-6 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Klinq CRM INVOICE</h2>
                    <p className="text-sm text-gray-500 font-mono mt-1">NO: {viewInvoice.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">Issued by</p>
                    <p className="text-sm text-gray-600">Klinq SaaS Tenant</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b py-4 my-4 border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Bill To</p>
                    <p className="font-bold text-gray-800 text-sm mt-0.5">{viewInvoice.contact?.full_name ?? 'Client Partner'}</p>
                    <p className="text-xs text-gray-500">{viewInvoice.contact?.email ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase font-semibold">Invoice Details</p>
                    <p className="text-xs text-gray-500 mt-1">Due Date: {viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString() : '—'}</p>
                    <p className="text-xs text-gray-500">Status: <span className="uppercase font-bold text-gray-700">{viewInvoice.status}</span></p>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-400 text-xs">
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewInvoice.line_items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-medium text-gray-800">{item.desc}</td>
                        <td className="py-2.5 text-center text-gray-600">{item.qty}</td>
                        <td className="py-2.5 text-right font-mono text-gray-600">₹{item.rate.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-bold font-mono text-gray-800">₹{(item.qty * item.rate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-gray-200 pt-4 flex flex-col items-end space-y-1.5 text-sm">
                  <div className="flex justify-between w-64 text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{viewInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-64 text-gray-600">
                    <span>Tax (GST {viewInvoice.tax_percent}%):</span>
                    <span className="font-mono">₹{(viewInvoice.subtotal * viewInvoice.tax_percent / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-64 font-bold text-lg text-gray-900 border-t pt-1.5 border-gray-100">
                    <span>Total:</span>
                    <span className="font-mono text-primary">₹{viewInvoice.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Invoice Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Draft New Invoice</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-sm overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Invoice Number *</Label>
                <Input placeholder="INV-2026-001" value={number} onChange={e => setNumber(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Recipient Client *</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Related Deal Opportunity</Label>
                <Select value={dealId} onValueChange={setDealId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <div className="flex justify-between items-center pb-1">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={addLineItem}>
                  <Plus className="size-3 mr-1" /> Add Item
                </Button>
              </div>
              
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input 
                      placeholder="Item description..." 
                      className="flex-1" 
                      value={item.desc} 
                      onChange={e => updateLineItem(idx, 'desc', e.target.value)} 
                    />
                    <Input 
                      type="number" 
                      placeholder="Qty" 
                      className="w-16" 
                      value={item.qty} 
                      onChange={e => updateLineItem(idx, 'qty', parseInt(e.target.value) || 0)} 
                    />
                    <Input 
                      type="number" 
                      placeholder="Rate" 
                      className="w-24" 
                      value={item.rate} 
                      onChange={e => updateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)} 
                    />
                    {lineItems.length > 1 && (
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeLineItem(idx)}>
                        <Trash className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="grid gap-1.5">
                <Label>Tax Percentage (GST)</Label>
                <div className="flex gap-1 items-center">
                  <Input type="number" value={taxPercent} onChange={e => setTaxPercent(parseInt(e.target.value) || 0)} />
                  <Percent className="size-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex flex-col justify-end text-right pr-2">
                <p className="text-xs text-muted-foreground">Estimated Total (Incl. GST)</p>
                <p className="text-xl font-bold font-mono text-primary">₹{total.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Drafting...' : 'Draft Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
