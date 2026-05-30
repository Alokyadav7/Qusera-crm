'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, AlertTriangle, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react'

type Stage = 'email' | 'sent'

interface CompanyContext {
  name: string
  logo_url: string | null
}

function ForgotPasswordContent() {
  const [stage, setStage] = useState<Stage>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  
  // Workspace / Tenant state
  const [company, setCompany] = useState<CompanyContext | null>(null)
  
  const searchParams = useSearchParams()
  const companyQuery = searchParams.get('company')

  // Detect dynamic company branding
  useEffect(() => {
    async function fetchCompanyBranding() {
      if (!companyQuery) return
      try {
        const supabase = createClient() as any
        const { data, error } = await supabase
          .from('companies')
          .select('name, logo_url')
          .eq('slug', companyQuery)
          .maybeSingle()

        if (!error && data) {
          setCompany(data as CompanyContext)
        }
      } catch (err) {
        console.error('Error fetching company context for reset page:', err)
      }
    }
    fetchCompanyBranding()
  }, [companyQuery])

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
    <div className="w-full max-w-[400px] mx-auto space-y-8 select-none">
      {/* Dynamic branding logo */}
      <div className="space-y-2">
        {company?.logo_url ? (
          <img
            src={company.logo_url}
            alt={company.name}
            className="h-8 max-w-[120px] object-contain rounded"
          />
        ) : (
          <div className="flex items-center gap-2">
            <img
              src="/Klinqcrm-logo.png"
              alt="Klinq CRM Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        )}

        <h2 className="text-xl font-semibold text-zinc-900 tracking-tight pt-2">
          {stage === 'email' ? 'Reset password' : 'Check your inbox'}
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed font-light">
          {stage === 'email' 
            ? `Enter your corporate email address to receive a secure recovery verification link${company ? ` for ${company.name}` : ''}.` 
            : `We sent a recovery link to ${email}.`
          }
        </p>
      </div>

      {stage === 'email' ? (
        <>
          {error && (
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex gap-3 text-xs text-zinc-700 animate-in fade-in duration-200" role="alert">
              <AlertTriangle className="size-4 text-zinc-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold tracking-wide text-zinc-900">Recovery Issue</p>
                <p className="text-zinc-500 leading-relaxed font-light">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 focus:bg-white transition-all duration-150 font-sans"
                />
              </div>
            </div>

            {/* Action button */}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-10 flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-black/10"
            >
              {loading ? (
                <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Send Recovery Link'
              )}
            </button>
          </form>
        </>
      ) : (
        /* Success State */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="size-12 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center">
            <CheckCircle2 className="size-6 text-zinc-850" />
          </div>
          
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-left text-xs text-zinc-600 space-y-2 leading-relaxed">
            <p className="font-semibold text-zinc-900">Didn&apos;t receive the link?</p>
            <ul className="space-y-1 list-disc list-inside text-zinc-500 font-light">
              <li>Check your corporate spam or quarantine folder.</li>
              <li>Confirm that the work email address is entered correctly.</li>
              <li>Reach out to your organization administrator.</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={() => { setStage('email'); setError(null) }}
              className="w-full h-10 flex items-center justify-center text-xs font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
            >
              Try another email address
            </button>
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="pt-6 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
        <Link href="/login" className="flex items-center gap-1.5 hover:text-zinc-900 transition-colors font-medium">
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
        <a href="mailto:support@klinq.app" className="flex items-center gap-1 hover:text-zinc-900 transition-colors font-medium">
          <HelpCircle className="size-3.5" />
          Support desk
        </a>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white relative select-none">
      {/* Fine lines pattern to align with login page background style */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 bottom-0 left-[20%] w-px bg-zinc-100/50" />
        <div className="absolute top-0 bottom-0 left-[80%] w-px bg-zinc-100/50" />
        <div className="absolute left-0 right-0 top-[25%] h-px bg-zinc-100/50" />
        <div className="absolute left-0 right-0 top-[75%] h-px bg-zinc-100/50" />
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        <Suspense fallback={
          <div className="w-full max-w-[400px] mx-auto space-y-6 animate-pulse">
            <div className="h-6 w-1/3 bg-zinc-100 rounded" />
            <div className="h-4 w-2/3 bg-zinc-100 rounded" />
            <div className="h-10 w-full bg-zinc-100 rounded" />
          </div>
        }>
          <ForgotPasswordContent />
        </Suspense>
      </div>
    </div>
  )
}
