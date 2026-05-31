"use client"

import { useState } from 'react'
import { Mail, MessageSquare, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BlogClient() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Subscription failed. Please try again.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 space-y-12">
      
      {/* SECTION 2 — COMING SOON STATE */}
      <div className="border border-border rounded-2xl bg-card p-8 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground font-display">We're working on our first posts</h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Stay tuned! We are compiling playbooks, API setup tutorials, and templates for Indian sales agents.
          </p>
        </div>

        {/* Subscribe Form */}
        <div className="max-w-md mx-auto pt-2">
          {status === 'success' ? (
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-4 py-2.5 rounded-lg w-full justify-center">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>✅ You're on the list!</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="enter your work email..."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                  className="flex-1 bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                />
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="h-9 px-4 text-xs font-bold bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {status === 'loading' ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <span>Notify me</span>
                  )}
                </Button>
              </div>
              {status === 'error' && (
                <p className="text-left text-[11px] text-destructive pl-1">{errorMessage}</p>
              )}
            </form>
          )}
        </div>

        {/* Reach Out / Contacts */}
        <div className="pt-4 border-t border-border/60 space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">In the meantime, reach out directly</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
            <a href="mailto:klinqcrm@gmail.com" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all">
              <Mail className="size-3.5 text-emerald-500" />
              <span>klinqcrm@gmail.com</span>
            </a>
            <a href="https://wa.me/918603058090" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all">
              <MessageSquare className="size-3.5 text-emerald-500" />
              <span>WhatsApp: 8603058090</span>
            </a>
          </div>
        </div>

      </div>

    </div>
  )
}
