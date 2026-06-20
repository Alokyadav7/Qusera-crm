// proxy.ts — Klinq CRM Auth Middleware
// Next.js middleware: session refresh + routing rules + rate limiting.
// This is the ONLY middleware file — middleware.ts imports and re-exports this.
//

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── In-Memory Rate Limiting ──────────────────────────────────────────────────
interface RateLimitBucket { count: number; resetTime: number }
const rateLimitMap = new Map<string, RateLimitBucket>()
const WINDOW_MS = 60 * 1000   // 1 minute window
const MAX_REQUESTS = 60        // 60 req/min per IP

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

// Clean up expired buckets every 5 minutes (runs once per worker lifetime)
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

// ── Route Classification ─────────────────────────────────────────────────────
//
// FULLY PUBLIC — no auth check at all (static assets, public pages)
const FULLY_PUBLIC_PREFIXES = [
  '/forgot-password',
  '/reset-password',
  '/suspended',
  '/accept-invite',
  '/invite',
  '/auth/callback',
  '/auth/error',
  '/_next',
  '/favicon.ico',
  '/Klinqcrm-logo.png',
  '/about',
  '/contact',
  '/careers',
  '/blog',
  '/privacy',
  '/terms',
]

// API routes — rate-limited but NOT auth-checked by middleware
// (each API route must authenticate itself via createServerClient + getUser)
const API_PREFIX = '/api/'

// Auth-aware public routes — these need the session to redirect logged-in users
// e.g. logged-in user visiting /login should go to their home, not see the form
const AUTH_AWARE_PUBLIC = ['/login', '/register']

// ── Helpers ───────────────────────────────────────────────────────────────────
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (request as any).ip ||
    'unknown'
  )
}

function redirectTo(url: string, request: NextRequest, response?: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(new URL(url, request.url))
  if (response) {
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expires: cookie.expires,
        maxAge: cookie.maxAge,
      })
    })
  }
  return redirectResponse
}

// ── Main Proxy ───────────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  // ── 1. Rate-limit ALL API routes first, then let them handle their own auth ─
  if (pathname.startsWith(API_PREFIX)) {
    const ip = getClientIp(request)
    if (ip !== 'unknown' && isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
    // Do NOT return here — fall through so Supabase SSR can refresh the session
    // cookie even on API routes (keeps auth tokens fresh)
    return response
  }

  // ── 2. Fully public routes — zero auth overhead ────────────────────────────
  if (pathname === '/' || FULLY_PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return response
  }

  // ── 3. /register is disabled — redirect to login with message ──────────────
  if (pathname.startsWith('/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('message', 'invitation_only')
    return redirectTo(url.pathname + url.search, request, response)
  }

  // ── 4. Create Supabase SSR client (refreshes session cookies) ────────────
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

  // ── 5. Validate session — getUser() hits Supabase auth server ─────────────
  //    This is the ONLY way to guarantee the JWT hasn't been revoked.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
  } catch {
    user = null
  }

  // ── 6. Auth-aware public routes (/login) ──────────────────────────────────
  //    If user IS logged in, redirect them to the right home instead of
  //    showing the login form again.
  if (AUTH_AWARE_PUBLIC.some(p => pathname.startsWith(p))) {
    if (!user) {
      // Not logged in — show the page normally
      return response
    }

    // User is already logged in → figure out where to send them
    // Fast path: check JWT metadata first (0 DB calls)
    const isSuperAdminByMeta =
      user.app_metadata?.is_platform_admin === true ||
      user.user_metadata?.is_platform_admin === true

    if (isSuperAdminByMeta) {
      return redirectTo('/super-admin', request, response)
    }

    // Slow path: check DB profile (1 DB call)
    try {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_super_admin, onboarding_completed, company_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.is_super_admin) return redirectTo('/super-admin', request, response)

      // Check if company is deleted
      if (profile?.company_id) {
        const { data: company } = await (supabase as any)
          .from('companies')
          .select('is_active, status, deleted_at')
          .eq('id', profile.company_id)
          .maybeSingle()

        if (!company || company.deleted_at || company.status === 'deleted') {
          await supabase.auth.signOut()
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          url.searchParams.set('error', 'company_deleted')
          return redirectTo(url.pathname + url.search, request, response)
        }
      }

      if (!profile?.onboarding_completed) return redirectTo('/onboarding', request, response)
    } catch { /* ignore — just show login */ }

    return redirectTo('/dashboard', request, response)
  }

  // ── 7. All remaining routes require authentication ─────────────────────────
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve the original destination so we can redirect back after login
    if (pathname !== '/login') {
      url.searchParams.set('next', pathname)
    }
    return redirectTo(url.pathname + url.search, request, response)
  }

  // ── 8. FAST PATH: Super admin via JWT metadata (0 DB calls) ───────────────
  //    app_metadata is signed into the JWT — reading it costs nothing.
  //    NOTE: On first login the JWT might not yet have is_platform_admin
  //    (Supabase propagates app_metadata to JWT on next refresh, not immediately).
  //    That's why we ALSO check the DB profile below as a fallback.
  const isSuperAdminByMeta =
    user.app_metadata?.is_platform_admin === true ||
    user.user_metadata?.is_platform_admin === true

  if (isSuperAdminByMeta) {
    // Super admin trying to access company routes → redirect to their home
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      return redirectTo('/super-admin', request, response)
    }
    // Super admin on /super-admin or elsewhere → allow through
    return response
  }

  // ── 9. COMPANY USER PATH: fetch full profile (1 DB call) ─────────────────
  //    One query gets everything we need — no follow-up queries.
  let profile: {
    is_super_admin: boolean | null
    onboarding_completed: boolean | null
    is_active: boolean | null
    company_id: string | null
  } | null = null

  try {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('is_super_admin, onboarding_completed, is_active, company_id')
      .eq('id', user.id)
      .maybeSingle()
    profile = data ?? null
  } catch {
    profile = null
  }

  // ── 10. DB-level super admin check (catches first-login JWT lag) ───────────
  //     If JWT didn't have is_platform_admin yet, the DB is the source of truth.
  if (profile?.is_super_admin === true) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      return redirectTo('/super-admin', request, response)
    }
    return response
  }

  // ── 11. Block non-super-admins from /super-admin ───────────────────────────
  if (pathname.startsWith('/super-admin')) {
    return redirectTo('/dashboard', request, response)
  }

  // ── 12. Deactivated individual user ───────────────────────────────────────
  if (profile?.is_active === false) {
    return redirectTo('/suspended', request, response)
  }

  // ── 13. Profile missing (new user / DB write latency) ─────────────────────
  //    The profile should exist by the time the user lands here, but DB writes
  //    can be delayed. Let the page handle the missing-profile gracefully.
  if (!profile) {
    return response
  }

  // ── 14. Company suspension / deletion check ─────────────────────────────────────────
  //    Only checked on dashboard/onboarding — uses company_id from profile
  //    already fetched above. No extra company_members query needed.
  if (
    profile.company_id &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))
  ) {
    try {
      const { data: company } = await (supabase as any)
        .from('companies')
        .select('is_active, status, deleted_at')
        .eq('id', profile.company_id)
        .maybeSingle()

      if (!company || company.deleted_at || company.status === 'deleted') {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'company_deleted')
        return redirectTo(url.pathname + url.search, request, response)
      }

      if (company.is_active === false || company.status === 'suspended') {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'suspended')
        return redirectTo(url.pathname + url.search, request, response)
      }
    } catch {
      // Company check failed — allow through, page will handle it
    }
  }

  // ── 15. Onboarding routing ────────────────────────────────────────────────
  const isOnboarded = profile.onboarding_completed === true

  if (!isOnboarded && !pathname.startsWith('/onboarding')) {
    return redirectTo('/onboarding', request, response)
  }

  if (isOnboarded && pathname.startsWith('/onboarding')) {
    return redirectTo('/dashboard', request, response)
  }

  // ── 16. All checks passed — allow through ────────────────────────────────
  return response
}

// config lives in middleware.ts — Next.js requires it to be statically defined there.