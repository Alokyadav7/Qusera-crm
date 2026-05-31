import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

async function isSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const svc = createServiceClient()
  const { data: admin } = await svc.from('platform_admins').select('is_active').eq('user_id', user.id).maybeSingle()
  return admin?.is_active === true || user.user_metadata?.is_platform_admin === true
}

// GET /api/super-admin/demo-requests
export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'all' | 'pending' | 'contacted' | etc.
  const intent = searchParams.get('intent')
  const limit = parseInt(searchParams.get('limit') ?? '100')

  const svc = createServiceClient()
  let query = (svc as any)
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (intent && intent !== 'all') {
    query = query.eq('intent', intent)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] })
}

// PATCH /api/super-admin/demo-requests  — update status/notes
export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, status, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const svc = createServiceClient()
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (typeof notes !== 'undefined') updates.notes = notes

  const { error } = await (svc as any)
    .from('demo_requests')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
