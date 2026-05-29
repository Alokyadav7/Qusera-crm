import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'

// GET /api/activity — Paginated activity events for current company
export const GET = withTenantAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url)
  const resourceType = url.searchParams.get('resourceType')
  const resourceId = url.searchParams.get('resourceId')
  const eventType = url.searchParams.get('eventType')
  const page = parseInt(url.searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '25', 10), 100)
  const offset = (page - 1) * limit

  const svc = createServiceClient()
  let query = svc
    .from('activity_events')
    .select('*', { count: 'exact' })
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (resourceType) query = query.eq('resource_type', resourceType)
  if (resourceId) query = query.eq('resource_id', resourceId)
  if (eventType) query = query.eq('event_type', eventType)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    events: data ?? [],
    total: count ?? 0,
    page,
    limit,
    hasMore: (count ?? 0) > offset + limit,
  })
})
