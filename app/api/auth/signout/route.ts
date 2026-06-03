import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/signout
// Server-side sign out — clears the SSR session cookie properly.
// Returns 200 JSON so the caller can handle the redirect themselves.
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
