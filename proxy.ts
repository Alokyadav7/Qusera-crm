// proxy.ts — Klinq CRM Auth Middleware
// Next.js middleware: session refresh + routing rules + rate limiting.
// This is the ONLY middleware file — middleware.ts has been removed.

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── In-Memory Rate Limiting ──────────────────────────────────────────────────
interface RateLimitBucket { count: number; resetTime: number }
const rateLimitMap = new Map<string, RateLimitBucket>()
const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 60

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = rateLimitMap.get(ip)
  if (!bucket || now > bucket.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return false
  }
  bucket.count += 1
  return bucket.count > MAX_REQUESTS
}

// Clean up stale rate limit entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any
  if (!g.__rateLimitCleanup) {
    g.__rateLimitCleanup = setInterval(() => {
      const now = Date.now()
      for (const [ip, bucket] of rateLimitMap.entries()) {
        if (now > bucket.resetTime) rateLimitMap.delete(ip)
      }
    }, 5 * 60 * 1000)
  }
}

// ── Public paths (no auth required) ─────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/login',
  '/forgot-password',  // Password reset request page
  '/reset-password',   // Password reset confirmation page
  '/suspended',
  '/accept-invite',
  '/invite',           // Team member invite acceptance — must be public
  '/auth/callback',
  '/auth/error',
  '/api/webhooks',
  '/api/auth',         // Auth API routes (reset-password etc)
  '/api/contact',      // Public contact form submission
  '/api/blog',         // Public blog subscribe
  '/api/demo',         // Public demo OTP flow
  '/_next',
  '/favicon.ico',
  // ── Public marketing pages ──────────────────────────────────────────────────
  '/about',
  '/contact',
  '/careers',
  '/blog',
  '/privacy',
  '/terms',
]

// ── Main Proxy (Next.js 16 — replaces middleware) ───────────────────────────
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const { pathname } = request.nextUrl

  // ── Rate limit /api/* routes ───────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      (request as any).ip ||
      'unknown'
    if (ip !== 'unknown' && isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // ── Always allow public routes ─────────────────────────────────────────────
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return response
  }

  // ── Landing page is public ────────────────────────────────────────────────
  if (pathname === '/') {
    return response
  }

  // ── /register is DISABLED — invitation-only ───────────────────────────────
  if (pathname.startsWith('/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('message', 'invitation_only')
    return NextResponse.redirect(url)
  }

  // ── Create Supabase SSR client + refresh session ───────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  // ── Not authenticated → /login ─────────────────────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Logged-in user visiting /login → redirect away ────────────────────────
  if (pathname.startsWith('/login')) {
    const isMeta =
      user.app_metadata?.is_platform_admin === true ||
      user.user_metadata?.is_platform_admin === true
    return NextResponse.redirect(
      new URL(isMeta ? '/super-admin' : '/dashboard', request.url)
    )
  }

  // ── Fetch profile for routing decisions ────────────────────────────────────
  let profile: { is_super_admin: boolean | null; onboarding_completed: boolean | null; is_active: boolean | null } | null = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_super_admin, onboarding_completed, is_active')
      .eq('id', user.id)
      .maybeSingle()
    profile = data
  } catch {
    profile = null
  }

  // ── User deactivated ───────────────────────────────────────────────────────
  if (profile?.is_active === false) {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }

  // ── Resolve super-admin status ─────────────────────────────────────────────
  const isSuperAdmin =
    profile?.is_super_admin === true ||
    user.app_metadata?.is_platform_admin === true ||
    user.user_metadata?.is_platform_admin === true

  // ── SUPER ADMIN routing ────────────────────────────────────────────────────
  if (isSuperAdmin) {
    // Super admin on /dashboard or /onboarding → /super-admin
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/onboarding')
    ) {
      return NextResponse.redirect(new URL('/super-admin', request.url))
    }
    // Super admin on /super-admin or anything else → allow
    return response
  }

  // ── COMPANY USER routing ───────────────────────────────────────────────────

  // Block company users from /super-admin → /dashboard
  if (pathname.startsWith('/super-admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check company suspension (for /dashboard and /onboarding only)
  if (
    (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) &&
    !pathname.startsWith('/api')
  ) {
    const { data: member } = await supabase
      .from('company_members')
      .select('company_id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (member?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('is_active')
        .eq('id', member.company_id)
        .single()

      if (company?.is_active === false) {
        return NextResponse.redirect(new URL('/suspended', request.url))
      }
    }
  }

  const isOnboarded = profile?.onboarding_completed === true

  // Not onboarded → force /onboarding
  if (!isOnboarded && !pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Already onboarded trying to revisit /onboarding → /dashboard
  if (isOnboarded && pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
