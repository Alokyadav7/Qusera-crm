'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, Mail, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react'

// ── Types for Multi-Tenant Support ───────────────────────────────────────────
interface CompanyContext {
  id: string
  name: string
  logo_url: string | null
  status: 'trial' | 'active' | 'suspended' | 'canceled' | 'deleted'
  suspension_reason: string | null
  brand_color: string | null
}

// ── Left panel — premium product visual & branding ──────────────────────────
function LeftBrandingPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-10 xl:p-12 bg-zinc-950 text-white relative select-none">
      {/* Structural layout lines — quiet and human-designed grid */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-zinc-900/40" />
        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-zinc-900/40" />
        <div className="absolute left-0 right-0 top-[30%] h-px bg-zinc-900/40" />
        <div className="absolute left-0 right-0 top-[70%] h-px bg-zinc-900/40" />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full space-y-6 xl:space-y-8">
        {/* Top brand header */}
        <div className="flex items-center gap-3">
          <img
            src="/Klinqcrm-logo.png"
            alt="Klinq CRM Logo"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Central visual block */}
        <div className="my-auto space-y-6 xl:space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-medium tracking-wide">
              <span>Invite-Only Access</span>
            </div>
            <h1 className="text-2xl xl:text-3xl font-normal leading-tight tracking-tight text-white font-sans max-w-md">
              The CRM built for growing Indian businesses.
            </h1>
            <p className="text-zinc-400 text-[13px] max-w-sm leading-relaxed font-sans font-light">
              Manage leads, close deals, and stay on top of every WhatsApp, SMS, and Email conversation — all in one place.
            </p>
          </div>

          {/* 4-Step Flow Chart */}
          <div className="space-y-4 max-w-md">
            <p className="text-[9px] font-semibold text-zinc-550 uppercase tracking-widest font-mono">HOW TO GET ACCESS</p>

            <div className="space-y-0.5">
              {/* Step 1 */}
              <div className="flex gap-4 relative">
                <div className="absolute left-[11px] top-6 bottom-0 w-px border-l border-dashed border-zinc-700" />

                <div className="flex flex-col items-center">
                  <div className="size-6 rounded-full bg-white text-zinc-950 border border-zinc-800 flex items-center justify-center text-xs font-semibold shrink-0">
                    1
                  </div>
                </div>
                <div className="pb-3.5">
                  <h3 className="text-[13px] font-semibold text-white">Book a Demo</h3>
                  <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5 font-light">
                    WhatsApp or email us. We&apos;ll show you the CRM and answer your questions.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 relative">
                <div className="absolute left-[11px] top-6 bottom-0 w-px border-l border-dashed border-zinc-700" />

                <div className="flex flex-col items-center">
                  <div className="size-6 rounded-full bg-white text-zinc-950 border border-zinc-800 flex items-center justify-center text-xs font-semibold shrink-0">
                    2
                  </div>
                </div>
                <div className="pb-3.5">
                  <h3 className="text-[13px] font-semibold text-white">We Onboard Your Company</h3>
                  <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5 font-light">
                    We set up your workspace, configure your team roles, and send your admin login credentials via email.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 relative">
                <div className="absolute left-[11px] top-6 bottom-0 w-px border-l border-dashed border-zinc-700" />

                <div className="flex flex-col items-center">
                  <div className="size-6 rounded-full bg-white text-zinc-950 border border-zinc-800 flex items-center justify-center text-xs font-semibold shrink-0">
                    3
                  </div>
                </div>
                <div className="pb-3.5">
                  <h3 className="text-[13px] font-semibold text-white">Admin Sets Up the Team</h3>
                  <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5 font-light">
                    Your admin logs in, changes password, and invites team members via email links.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className="size-6 rounded-full bg-white text-zinc-950 border border-zinc-800 flex items-center justify-center text-xs font-semibold shrink-0">
                    4
                  </div>
                </div>
                <div className="pb-0.5">
                  <h3 className="text-[13px] font-semibold text-white">Your Team Gets Access</h3>
                  <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5 font-light">
                    Each member accepts their invite, sets a password, and starts using the CRM.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact box */}
          <div className="pt-3 border-t border-zinc-800 max-w-md text-[11px] text-zinc-400 space-y-1 font-light leading-relaxed">
            <p className="font-semibold text-zinc-300">Want to get started?</p>
            <div className="flex flex-col gap-0.5 mt-0.5 font-mono">
              <span>Email — klinqcrm@gmail.com</span>
              <span>WhatsApp — 8603058090</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Right panel — robust multi-tenant authentication form ────────────────────
function LoginFormContent() {
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Workspace/Tenant State
  const [company, setCompany] = useState<CompanyContext | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Extract custom states from search query
  const errorQuery = searchParams.get('error')
  const messageQuery = searchParams.get('message')
  const companyQuery = searchParams.get('company')

  // Resolve dynamic Workspace / Tenant context
  useEffect(() => {
    async function detectWorkspace() {
      try {
        const supabase = createClient() as any
        let detectedSlug = companyQuery

        // Fallback to checking subdomain logic if query is missing
        if (!detectedSlug && typeof window !== 'undefined') {
          const hostname = window.location.hostname
          // Check if subdomain is present and is not 'www' or local hosts
          const parts = hostname.split('.')
          if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
            detectedSlug = parts[0]
          }
        }

        if (detectedSlug) {
          const { data, error } = await supabase
            .from('companies')
            .select('id, name, logo_url, status, suspension_reason, brand_color')
            .eq('slug', detectedSlug)
            .maybeSingle()

          if (!error && data) {
            setCompany(data as CompanyContext)
          }
        }
      } catch (err) {
        console.error('Workspace detection failed:', err)
      } finally {
        setWorkspaceLoading(false)
      }
    }

    detectWorkspace()
  }, [companyQuery])

  // Map incoming errors or statuses to premium states
  useEffect(() => {
    if (errorQuery) {
      if (errorQuery === 'invalid_credentials') {
        setErrorMsg('The email or password you entered is incorrect.')
      } else if (errorQuery === 'session_expired') {
        setErrorMsg('Your security session has expired. Please sign in again.')
      } else if (errorQuery === 'suspended') {
        setErrorMsg('This workspace account is suspended. Please contact your administrator.')
      } else if (errorQuery === 'invitation_expired') {
        setErrorMsg('This invitation link has expired or is invalid.')
      } else if (errorQuery === 'org_disabled') {
        setErrorMsg('This organization node has been disabled.')
      } else {
        setErrorMsg('An error occurred during authentication. Please try again.')
      }
    }

    if (messageQuery === 'invitation_only') {
      setSuccessMsg('This node operates under corporate invitation requirements.')
    }
  }, [errorQuery, messageQuery])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    const supabase = createClient() as any

    // Sign in to Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg(error.message || 'Invalid email or password.')
      setLoading(false)
      return
    }

    if (data?.user) {
      const userId = data.user.id

      // Single parallel fetch — eliminates login slowness from sequential DB calls
      const [profileRes, memberRes, platformAdminRes] = await Promise.all([
        supabase.from('profiles').select('is_active, is_super_admin').eq('id', userId).maybeSingle(),
        supabase.from('company_members').select('company:companies(id,status,suspension_reason)').eq('user_id', userId).maybeSingle(),
        supabase.from('platform_admins').select('is_active').eq('user_id', userId).maybeSingle(),
      ])

      const profile = profileRes.data
      const userCompany = (memberRes.data as any)?.company
      const platformAdmin = platformAdminRes.data

      // Check account active state
      if (profile && !profile.is_active) {
        await supabase.auth.signOut()
        setErrorMsg('Your account has been deactivated by the system administrator.')
        setLoading(false)
        return
      }

      // Check company suspension
      if (userCompany && userCompany.status === 'suspended') {
        await supabase.auth.signOut()
        setErrorMsg(`Workspace suspended: ${userCompany.suspension_reason || 'Administrative hold'}`)
        setLoading(false)
        return
      }

      // Determine redirect: platform_admins table OR is_super_admin flag OR user metadata
      const isSuperAdmin =
        platformAdmin?.is_active === true ||
        profile?.is_super_admin === true ||
        data.user.user_metadata?.is_platform_admin === true ||
        (data.user as any).app_metadata?.is_platform_admin === true

      router.push(isSuperAdmin ? '/super-admin' : '/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  // OAuth Google Login integration
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setErrorMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
      setGoogleLoading(false)
    }
  }

  // Handle suspended workspace state early
  if (company && (company.status === 'suspended' || company.status === 'deleted')) {
    return (
      <div className="w-full max-w-[400px] mx-auto space-y-6 text-center select-none animate-in fade-in duration-300">
        <div className="size-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
          <AlertOctagon className="size-6 text-red-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">Workspace Suspended</h2>
          <p className="text-zinc-500 text-xs leading-relaxed">
            The workspace for <strong className="text-zinc-800">{company.name}</strong> has been locked or suspended by the platform administrator.
          </p>
        </div>
        {company.suspension_reason && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-left">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Hold Reason</p>
            <p className="text-xs text-zinc-700 mt-1 font-mono leading-relaxed">{company.suspension_reason}</p>
          </div>
        )}
        <div className="pt-2">
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full h-10 flex items-center justify-center text-xs font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
          >
            Switch Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[400px] mx-auto space-y-8 select-none">
      {/* Header zone */}
      <div className="space-y-2">
        {/* Dynamic Logo or standard representation */}
        {company?.logo_url ? (
          <img
            src={company.logo_url}
            alt={company.name}
            className="h-8 max-w-[120px] object-contain rounded"
          />
        ) : (
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src="/Klinqcrm-logo.png"
              alt="Klinq CRM Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        )}

        <h2 className="text-xl font-semibold text-zinc-900 tracking-tight pt-2">
          {company ? `Sign in to ${company.name}` : 'Sign in to your account'}
        </h2>
        <p className="text-xs text-zinc-500">
          {company ? 'Enterprise single-tenant workspace node' : 'Enter your credentials to access your workspace'}
        </p>
      </div>

      {/* Dynamic Status Notification cards */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex gap-3 text-xs text-zinc-700 animate-in fade-in duration-200" role="alert">
          <AlertTriangle className="size-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold tracking-wide text-zinc-900">Access Issue</p>
            <p className="text-zinc-500 leading-relaxed font-light">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex gap-3 text-xs text-zinc-700 animate-in fade-in duration-200">
          <CheckCircle2 className="size-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold tracking-wide text-zinc-900">Node Restriction</p>
            <p className="text-zinc-500 leading-relaxed font-light">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Work Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 focus:bg-white transition-all duration-150 font-sans"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Password
            </label>
            <Link href="/forgot-password" className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full h-10 pl-9 pr-10 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 focus:bg-white transition-all duration-150 font-sans"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            className="size-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
          />
          <label htmlFor="rememberMe" className="ml-2 text-xs text-zinc-500 select-none cursor-pointer">
            Keep me signed in on this device
          </label>
        </div>

        {/* Action button */}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full h-10 flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-black/10"
        >
          {loading ? (
            <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              Continue <ArrowRight className="size-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Horizontal Divider */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-zinc-200"></div>
        <span className="flex-shrink mx-4 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">or</span>
        <div className="flex-grow border-t border-zinc-200"></div>
      </div>

      {/* OAuth Continue with Google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading || googleLoading}
        className="w-full h-10 flex items-center justify-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold rounded-lg text-xs transition-colors disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
      >
        {googleLoading ? (
          <div className="size-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
        ) : (
          <>
            {/* Minimal SVG Google Logo */}
            <svg className="size-4 mr-1 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.74 14.93 1 12 1 7.37 1 3.4 3.66 1.48 7.56l3.7 2.87C6.07 7.23 8.78 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.45c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.74-4.88 3.74-8.49z"
              />
              <path
                fill="#FBBC05"
                d="M5.18 10.43c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.48 3.2C.54 5.08 0 7.18 0 9.38s.54 4.3 1.48 6.18l3.7-2.87z"
              />
              <path
                fill="#34A853"
                d="M12 17.76c-3.22 0-5.93-2.19-6.82-5.39l-3.7 2.87C3.4 19.14 7.37 21.76 12 21.76c2.93 0 5.39-.98 7.19-2.65l-3.66-2.84c-1 .67-2.27 1.09-3.53 1.09z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed font-light mt-4">
        Don&apos;t have an account? Your company admin will send you an invite link to join.
      </p>

      {/* Footer Support Information */}
      <div className="pt-6 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="font-light">Access is by invitation only</span>
        <a href="mailto:klinqcrm@gmail.com" className="hover:text-zinc-900 transition-colors font-medium">
          Need help? klinqcrm@gmail.com
        </a>
      </div>
    </div>
  )
}

// ── Main Page Layout ─────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_540px] bg-white select-none">
      <LeftBrandingPanel />

      <div className="flex items-center justify-center p-8 bg-white border-l border-zinc-200/50 relative">
        <Suspense fallback={
          <div className="w-full max-w-[400px] mx-auto space-y-6 animate-pulse">
            <div className="h-6 w-1/3 bg-zinc-100 rounded" />
            <div className="h-4 w-2/3 bg-zinc-100 rounded" />
            <div className="h-10 w-full bg-zinc-100 rounded" />
            <div className="h-10 w-full bg-zinc-100 rounded" />
          </div>
        }>
          <LoginFormContent />
        </Suspense>
      </div>
    </div>
  )
}
