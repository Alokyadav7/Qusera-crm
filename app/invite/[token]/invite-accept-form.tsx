'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  token: string
  email: string
}

export function InviteAcceptForm({ token, email }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password, fullName: form.fullName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to accept invite'); return }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: form.password })
      if (signInError) { toast.success('Account created! Please log in.'); router.push('/login'); return }

      toast.success(`Welcome to ${data.companyName}!`)
      router.push('/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1.5">Full Name</label>
        <input type="text" required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="John Smith"
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-900 placeholder:text-zinc-300 bg-white" />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1.5">Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters"
            className="w-full px-3 py-2 pr-10 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-900 placeholder:text-zinc-300 bg-white" />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1.5">Confirm Password</label>
        <input type={showPw ? 'text' : 'password'} required value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password"
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-900 placeholder:text-zinc-300 bg-white" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="size-4 animate-spin" />Setting up account…</> : 'Create Account & Join'}
      </button>
    </form>
  )
}
