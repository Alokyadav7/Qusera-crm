import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/companies/[id]/timeline?days=7|30|90|all&q=keyword
export const GET = withSuperAdmin(async (req: NextRequest, _adminId: string) => {
  const id = req.nextUrl.pathname.split('/').at(-2)! // /api/super-admin/companies/[id]/timeline
  const svc = createServiceClient()
  const { searchParams } = new URL(req.url)
  const days = searchParams.get('days') ?? '30'
  const q = searchParams.get('q') ?? ''

  let query = (svc as any)
    .from('audit_logs')
    .select('id, action, created_at, user_id, metadata, profiles:user_id(email, full_name)')
    .eq('company_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (days !== 'all') {
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  if (q) {
    query = query.ilike('action', `%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events = ((data ?? []) as any[]).map((log: any) => ({
    id: log.id,
    action: log.action,
    created_at: log.created_at,
    user_email: (log.profiles as any)?.email ?? null,
    user_name: (log.profiles as any)?.full_name ?? null,
    metadata: log.metadata ?? {},
  }))

  return NextResponse.json({ events })
})
