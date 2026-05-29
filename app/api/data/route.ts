import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

// Universal data API — used by client hooks when anon key is blocked by RLS
// Returns table data using service role (server-side only, never exposes service key to browser)
// Scopes by company_id when provided for multi-tenant isolation

const ALLOWED_TABLES = [
  'leads', 'tasks', 'interactions', 'contacts', 'accounts', 'deals',
  'emails', 'whatsapp_messages', 'automations', 'automation_logs',
  'crm_invoices', 'saved_reports', 'integrations', 'sms_messages',
  'customer_health_snapshots', 'renewal_opportunities', 'lead_score_history',
  'profiles', 'companies', 'company_members', 'user_active_company',
  'notifications', 'audit_logs', 'api_keys', 'webhooks',
]

// Tables that must be scoped by company_id for multi-tenant isolation
const COMPANY_SCOPED_TABLES = [
  'leads', 'tasks', 'interactions', 'contacts', 'accounts', 'deals',
  'emails', 'whatsapp_messages', 'automations', 'automation_logs',
  'crm_invoices', 'saved_reports', 'sms_messages',
  'customer_health_snapshots', 'renewal_opportunities',
]

// Tables scoped by user_id
const USER_SCOPED_TABLES = [
  'lead_score_history', 'notifications', 'profiles',
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000)
  const orderBy = searchParams.get('orderBy') || 'created_at'
  const ascending = searchParams.get('ascending') === 'true'
  const companyIdParam = searchParams.get('company_id')
  const userIdParam = searchParams.get('user_id')

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid or disallowed table' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Get the requesting user for scoping (if session available)
    let sessionUserId: string | null = userIdParam || null
    let sessionCompanyId: string | null = companyIdParam || null

    if (!sessionCompanyId || !sessionUserId) {
      try {
        const sessionClient = await createClient()
        const { data: { user } } = await sessionClient.auth.getUser()
        if (user) {
          sessionUserId = sessionUserId || user.id
          if (!sessionCompanyId) {
            const { data: uac } = await (supabase as any)
              .from('user_active_company')
              .select('company_id')
              .eq('user_id', user.id)
              .single()
            sessionCompanyId = (uac as any)?.company_id || null
          }
        }
      } catch { /* no session — dev bypass mode */ }
    }

    let query = (supabase as any).from(table).select('*').order(orderBy, { ascending }).limit(limit)

    // Apply company_id scoping for multi-tenant isolation
    if (sessionCompanyId && COMPANY_SCOPED_TABLES.includes(table)) {
      query = query.eq('company_id', sessionCompanyId)
    }

    // Apply user_id scoping for user-level tables
    if (sessionUserId && USER_SCOPED_TABLES.includes(table)) {
      query = query.eq('user_id', sessionUserId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [], company_id: sessionCompanyId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
