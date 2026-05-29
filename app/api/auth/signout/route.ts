import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/signout
// Server-side sign out — clears the SSR cookie session properly
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Redirect to login — this response will also clear auth cookies via the SSR client
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    { status: 302 }
  )
}
