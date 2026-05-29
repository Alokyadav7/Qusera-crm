'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle, IndianRupee, Calendar, MessageSquare, PenLine, Package } from 'lucide-react'

interface PortalProduct { product_name: string; qty: number; unit_price: number; discount_pct: number; total: number }
interface PortalEvent { event_type: string; comment: string | null; signature: string | null; created_at: string }
interface Deal { id: string; title: string; value: number; currency: string; stage: string; close_date: string | null; notes: string | null; probability: number }

interface Props {
  tokenId: string
  deal: Deal | null
  products: PortalProduct[]
  events: PortalEvent[]
}

export function PortalPageClient({ tokenId, deal, products, events }: Props) {
  const [signature, setSignature] = useState('')
  const [comment, setComment] = useState('')
  const [signing, setSigning] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [accepted, setAccepted] = useState(
    events.some(e => e.event_type === 'accepted')
  )
  const [clientComments, setClientComments] = useState(
    events.filter(e => e.event_type === 'commented')
  )

  if (!deal) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Deal information not found.</p>
    </div>
  )

  const handleAccept = async () => {
    if (!signature.trim()) { toast.error('Please enter your name as signature'); return }
    setSigning(true)
    const res = await fetch('/api/portal/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId, event_type: 'accepted', signature: signature.trim() }),
    })
    if (res.ok) {
      setAccepted(true)
      toast.success('Deal accepted! The team will be in touch shortly.')
    } else {
      toast.error('Failed to submit. Please try again.')
    }
    setSigning(false)
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    setSubmittingComment(true)
    const res = await fetch('/api/portal/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenId, event_type: 'commented', comment: comment.trim() }),
    })
    if (res.ok) {
      setClientComments(prev => [...prev, { event_type: 'commented', comment: comment.trim(), signature: null, created_at: new Date().toISOString() }])
      setComment('')
      toast.success('Comment sent')
    }
    setSubmittingComment(false)
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: deal.currency || 'INR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight">Qwix CRM</div>
          <Badge variant="outline" className="capitalize">{deal.stage}</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Deal Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-6">
          <h1 className="text-2xl font-bold mb-1">{deal.title}</h1>
          <p className="text-muted-foreground text-sm mb-4">Proposal prepared for your review</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-lg">
              <IndianRupee className="size-5" />{fmt(deal.value)}
            </div>
            {deal.close_date && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-4" />
                Valid until {new Date(deal.close_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </div>
            )}
          </div>
          {deal.notes && (
            <p className="mt-4 text-sm text-muted-foreground border-t pt-4 leading-relaxed">{deal.notes}</p>
          )}
        </div>

        {/* Product Breakdown */}
        {products.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Package className="size-4" /> Scope of Work</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  {products.some(p => p.discount_pct > 0) && <th className="py-2 text-right">Discount</th>}
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium">{p.product_name}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{p.qty}</td>
                    <td className="py-2.5 text-right font-mono">{fmt(p.unit_price)}</td>
                    {products.some(pr => pr.discount_pct > 0) && (
                      <td className="py-2.5 text-right text-emerald-600">{p.discount_pct > 0 ? `-${p.discount_pct}%` : '—'}</td>
                    )}
                    <td className="py-2.5 text-right font-semibold font-mono">{fmt(p.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={products.some(p => p.discount_pct > 0) ? 4 : 3} className="pt-3 text-right font-semibold">Total</td>
                  <td className="pt-3 text-right font-bold text-lg font-mono">{fmt(products.reduce((s, p) => s + p.total, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare className="size-4" /> Questions & Comments</h2>
          {clientComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet. Ask us anything below.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {clientComments.map((e, i) => (
                <div key={i} className="bg-muted/40 rounded-xl px-4 py-3">
                  <p className="text-sm">{e.comment}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(e.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Input placeholder="Type a question or comment..." value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()} />
            <Button onClick={handleComment} disabled={submittingComment || !comment.trim()} size="sm">
              Send
            </Button>
          </div>
        </div>

        {/* Accept / Signature */}
        <div className={`rounded-2xl shadow-sm border p-6 ${accepted ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20' : 'bg-white dark:bg-slate-900'}`}>
          {accepted ? (
            <div className="text-center py-4">
              <CheckCircle className="size-14 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">Deal Accepted!</h2>
              <p className="text-sm text-muted-foreground mt-1">Thank you. Our team will contact you within 24 hours.</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold mb-1 flex items-center gap-2"><PenLine className="size-4" /> Accept This Proposal</h2>
              <p className="text-sm text-muted-foreground mb-4">Type your full name below as your digital signature to accept.</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full Name (Signature) *</Label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    className="font-serif text-lg italic"
                  />
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleAccept}
                  disabled={signing || !signature.trim()}
                  size="lg"
                >
                  {signing ? 'Processing...' : '✓ Accept Proposal'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By clicking accept, you agree to the terms presented in this proposal.
                  Timestamp: {new Date().toLocaleString('en-IN')}
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-muted-foreground">
        Powered by <span className="font-semibold">Qwix CRM</span>
      </footer>
    </div>
  )
}
