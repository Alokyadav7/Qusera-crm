import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/alerts — returns unresolved platform_alerts
export const GET = withSuperAdmin(async (_req: NextRequest, _adminId: string) => {
  const svc = createServiceClient()

  const { data: alerts, error } = await svc
    .from('platform_alerts')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ alerts: alerts ?? [] })
})
