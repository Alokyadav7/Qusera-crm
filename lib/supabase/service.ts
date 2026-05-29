// ─── Klinq CRM — Service Role Supabase Client ──────────────────────────────────
// Used ONLY in API routes and server actions that need to bypass RLS
// NEVER expose this client to the browser

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let _serviceClient: SupabaseClient<Database> | null = null

export function createServiceClient(): SupabaseClient<Database> {
  if (_serviceClient) return _serviceClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  _serviceClient = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _serviceClient
}
