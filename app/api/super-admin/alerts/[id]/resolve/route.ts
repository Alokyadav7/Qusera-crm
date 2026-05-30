import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/super-admin/alerts/[id]/resolve
export const POST = withSuperAdmin(async (req: NextRequest, adminId: string) => {
  const alertId = req.nextUrl.pathname.split('/').at(-2)! // /api/super-admin/alerts/[id]/resolve
  const svc = createServiceClient()

  const { error } = await (svc as any)
    .from('platform_alerts')
    .update({
      is_resolved: true,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Alert resolved' })
})
