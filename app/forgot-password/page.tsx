'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react'

type Stage = 'email' | 'sent'

export default function ForgotPasswordPage() {
  const [stage, setStage] = useState<Stage>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()

      if (res.ok || res.status === 404) {
        setStage('sent')
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative ambient backgrounds */}
      <div className="absolute right-[-10%] top-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/[0.03] blur-[140px] pointer-events-none" />
      <div className="absolute left-[-10%] bottom-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.02] blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-60 dark:opacity-100" />

      <div className="w-full max-w-[440px] relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="size-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg shadow-black/25">
            <span className="text-white font-black text-base tracking-tight font-display">K</span>
          </div>
          <span className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight font-display">Klinq CRM</span>
        </div>

        {/* Styled Glassmorphic Login Card */}
        <div className="bg-white dark:bg-zinc-900/35 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/85 shadow-2xl dark:shadow-black/50 rounded-3xl p-8 sm:p-10 transition-all duration-300">
          {stage === 'email' ? (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-3">
                  <Shield className="size-3 text-violet-400" />
                  <span>Self-service recovery</span>
                </div>
                <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight font-display">
                  Reset password
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-sans font-light">
                  Enter your corporate email address to receive a secure recovery verification link.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex gap-2.5 items-center text-xs text-red-500">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Email address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 dark:text-zinc-500 pointer-events-none group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/[0.05] focus:border-zinc-900 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-lg shadow-black/[0.08] hover:shadow-black/[0.15] dark:shadow-none cursor-pointer mt-2"
                >
                  {loading ? (
                    <><Loader2 className="size-4 animate-spin" />Requesting link...</>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* ── Success state ── */
            <div className="text-center py-2 space-y-4">
              <div className="size-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-6 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black text-zinc-900 dark:text-white font-display">Check your inbox</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans font-light">
                  If <span className="font-semibold text-zinc-700 dark:text-zinc-300">{email}</span> is an active member account, you will receive a password reset link shortly.
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1.5 text-left font-sans font-light leading-relaxed">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Haven&apos;t received it?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Check your spam and junk filters</li>
                  <li>Confirm your exact organizational email</li>
                  <li>Reach out to your system administrator</li>
                </ul>
              </div>
              <button
                onClick={() => { setStage('email'); setError(null) }}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors font-medium font-mono"
              >
                ← TRY DIFFERENT EMAIL
              </button>
            </div>
          )}
        </div>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </Link>

        </div>
      </div>
    </div>
  )
}
