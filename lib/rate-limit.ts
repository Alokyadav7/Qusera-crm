/**
 * lib/rate-limit.ts — In-memory sliding window rate limiter
 * For production use Redis (Upstash), but this works for single-instance Next.js.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

interface RateLimitConfig {
  key: string           // e.g. `sms:${companyId}`
  limit: number         // max requests
  windowMs: number      // window in ms
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number   // seconds
}

export function rateLimit({ key, limit, windowMs }: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const win = store.get(key)

  if (!win || now >= win.resetAt) {
    // Fresh window
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (win.count >= limit) {
    const retryAfter = Math.ceil((win.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, resetAt: win.resetAt, retryAfter }
  }

  win.count++
  return { allowed: true, remaining: limit - win.count, resetAt: win.resetAt }
}

// ── Named limiters ────────────────────────────────────────────────────────────
export const LIMITS = {
  sms:           { limit: 10,  windowMs: 60_000 },
  email:         { limit: 50,  windowMs: 60_000 },
  whatsapp:      { limit: 20,  windowMs: 60_000 },
  publicApi:     { limit: 100, windowMs: 60_000 },
  kpis:          { limit: 30,  windowMs: 60_000 },
  // Auth-specific
  loginAttempt:  { limit: 5,   windowMs: 15 * 60_000 },  // 5 per 15 min
  resetPassword: { limit: 3,   windowMs: 60 * 60_000 },  // 3 per hour
  impersonate:   { limit: 10,  windowMs: 60 * 60_000 },  // 10 per hour
} as const

type LimiterName = keyof typeof LIMITS

export function checkRateLimit(name: LimiterName, companyId: string): RateLimitResult {
  return rateLimit({ key: `${name}:${companyId}`, ...LIMITS[name] })
}

/** Returns a 429 NextResponse if rate limited. Usage: const denied = rateLimitResponse(...); if (denied) return denied */
export function rateLimitResponse(result: RateLimitResult) {
  if (result.allowed) return null
  const { NextResponse } = require('next/server')
  return NextResponse.json(
    { error: 'Rate limit exceeded', code: 'RATE_LIMITED', retryAfter: result.retryAfter },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter ?? 60),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    }
  )
}
