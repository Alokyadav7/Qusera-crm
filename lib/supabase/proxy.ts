import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

function isSupabaseConfigured(): boolean {
  return !!(
    SUPABASE_URL && SUPABASE_ANON_KEY &&
    SUPABASE_URL !== 'https://your-project.supabase.co' &&
    SUPABASE_ANON_KEY !== 'your-anon-key-here' &&
    SUPABASE_URL.includes('supabase.co')
  )
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isSupabaseConfigured()) {
    if (pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  // ── Protect /dashboard — redirect unauthenticated users to /login ──
  if (pathname.startsWith('/dashboard') && !user && !DEV_BYPASS_AUTH) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Redirect logged-in users away from /login → /dashboard ──
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Protect /onboarding — only authenticated users ──
  if (pathname.startsWith('/onboarding') && !user && !DEV_BYPASS_AUTH) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── After login, redirect to onboarding if not completed ──
  // (Check profile in Supabase — if no record, send to /onboarding)
  if (pathname === '/dashboard' && user && !DEV_BYPASS_AUTH) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (!profile?.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    } catch {
      // profiles table may not exist yet — skip onboarding redirect
    }
  }

  return supabaseResponse
}
