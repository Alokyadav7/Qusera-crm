'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail, AlertCircle, MessageSquare, Users, Building2, ArrowRight, Shield } from 'lucide-react'

// ── Left panel — branding + how it works ────────────────────────────────────
function BrandingPanel() {
  const steps = [
    {
      number: '01',
      icon: MessageSquare,
      title: 'Contact Us',
      desc: 'Connect with us to share your requirements and get started.',
    },
    {
      number: '02',
      icon: Building2,
      title: 'Setup & Provision',
      desc: 'We configure your secure corporate space and issue admin credentials directly.',
    },
    {
      number: '03',
      icon: Users,
      title: 'Deploy Team Access',
      desc: 'Your designated admin invites members with customized permission profiles.',
    },
  ]

  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-12 xl:p-16 bg-zinc-950 text-white relative overflow-hidden">
      {/* Dynamic Background Mesh / Ambient Glow */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-black/30 border border-white/20 relative overflow-hidden group">
            <span className="text-zinc-950 font-black text-lg tracking-tight font-display z-10 transition-transform group-hover:scale-110 duration-300">K</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-white opacity-0 group-hover:opacity-10 duration-300" />
          </div>
          <span className="font-bold text-xl tracking-tight font-display bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            Klinq CRM
          </span>
        </div>

        {/* Mid Section Content */}
        <div className="space-y-10 my-auto py-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-xs font-medium tracking-wide">
              <Shield className="size-3 text-violet-400" />
              <span>Multi-Tenant Enterprise Platform</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight font-display bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-transparent">
              The CRM built<br />for your business.
            </h1>
            <p className="text-zinc-400 text-base max-w-md leading-relaxed font-sans font-light">
              High-performance sales automation, fully isolated tenant architecture, and robust team workflows.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Workflow Guide
            </p>
            <div className="space-y-5">
              {steps.map((step) => {
                const Icon = step.icon
                return (
                  <div key={step.number} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="size-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-white/[0.08] group-hover:border-white/20">
                        <Icon className="size-4.5 text-zinc-400 group-hover:text-white transition-colors" />
                      </div>
                      {step.number !== '03' && (
                        <div className="w-px flex-1 bg-gradient-to-b from-white/[0.08] to-transparent my-2 min-h-[24px]" />
                      )}
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-violet-400 tracking-wider font-mono">{step.number}</span>
                        <p className="font-semibold text-sm text-zinc-200 group-hover:text-white transition-colors">{step.title}</p>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed font-sans">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Interactive Help Desk Card */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3.5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">Request CRM Instance</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <a href="mailto:sales@klinq.app" className="flex flex-col p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                <span className="text-zinc-500 mb-0.5">Corporate Email</span>
                <span className="font-medium text-zinc-200">sales@klinq.app</span>
              </a>
              <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="flex flex-col p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                <span className="text-zinc-500 mb-0.5">Direct WhatsApp</span>
                <span className="font-medium text-zinc-200">+91 WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-zinc-600 font-mono tracking-tight">
          © {new Date().getFullYear()} Klinq CRM Platform.
        </p>
      </div>
    </div>
  )
}

// ── Right panel — login form ─────────────────────────────────────────────────
function LoginForm() {
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationOnly = searchParams.get('message') === 'invitation_only'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    router.refresh()
    await new Promise(r => setTimeout(r, 150))
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col justify-center h-full px-6 py-12 sm:px-12 md:px-16 lg:px-12 xl:px-16 w-full max-w-[480px] mx-auto relative z-10">
      {/* Mobile Header */}
      <div className="flex items-center gap-2.5 mb-10 lg:hidden justify-center sm:justify-start">
        <div className="size-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg shadow-black/25">
          <span className="text-white font-black text-base tracking-tight font-display">K</span>
        </div>
        <span className="font-bold text-zinc-900 dark:text-white tracking-tight font-display text-lg">Klinq CRM</span>
      </div>

      {/* Styled Glassmorphic Login Card */}
      <div className="bg-white dark:bg-zinc-900/35 dark:backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/85 shadow-2xl dark:shadow-black/50 rounded-3xl p-8 sm:p-10 transition-all duration-300">
        {/* Title */}
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight font-display">
            Welcome back
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 font-medium uppercase tracking-wider">
            Sign in to your account
          </p>
        </div>

        {/* Notices */}
        {invitationOnly && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex gap-3 animate-fade-in">
            <AlertCircle className="size-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                Invitation Required
              </p>
              <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
                Self-registration is deactivated. Please contact your company administrator to obtain access.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex gap-3 animate-fade-in text-xs text-red-500">
            <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold uppercase tracking-wide">Access Denied</p>
              <p className="text-red-500/85 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Inputs */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 dark:text-zinc-500 pointer-events-none group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/[0.05] focus:border-zinc-900 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium">
                Forgot?
              </Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 dark:text-zinc-500 pointer-events-none group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter password"
                className="w-full pl-10 pr-11 py-3 text-sm bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/[0.05] focus:border-zinc-900 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-950 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-lg shadow-black/[0.08] hover:shadow-black/[0.15] dark:shadow-none mt-4 cursor-pointer"
          >
            {loading ? (
              <><div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Authenticating...</>
            ) : (
              <>Sign In <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></>
            )}
          </button>
        </form>

        {/* Safe-haven Notice */}
        <p className="mt-8 text-center text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-sans font-light">
          Secured corporate domain · Invitation-only node
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600 leading-relaxed max-w-xs mx-auto">
        Don&apos;t have an account? Your corporate administrator must invite you to join this workspace.
      </p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_540px] bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
      {/* Decorative background grid and flows for the overall page */}
      <div className="absolute right-0 top-[-20%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute left-[30%] bottom-[-20%] w-[600px] h-[600px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />

      <BrandingPanel />
      
      <div className="flex items-center justify-center bg-white dark:bg-zinc-950/70 border-l border-zinc-200/60 dark:border-zinc-900/60 backdrop-blur-md relative">
        <LoginForm />
      </div>
    </div>
  )
}
