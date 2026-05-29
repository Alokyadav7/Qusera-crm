import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'
import { softDelete } from '@/lib/soft-delete'

// POST /api/super-admin/companies/[id]/[action]
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  return withSuperAdmin(async (request, adminUserId) => {
    const { id, action } = await params
    const svc = createServiceClient()

    // Parse body (optional fields)
    let body: Record<string, string> = {}
    try { body = await request.json() } catch { /* no body */ }

    if (action === 'suspend') {
      const suspensionReason = body.reason?.trim() ?? null
      await (svc as any).from('companies').update({
        status: 'suspended',
        is_active: false,
        suspension_reason: suspensionReason,
        updated_at: new Date().toISOString(),
      } as any).eq('id', id)
      await emitEvent({
        actorId: adminUserId, actorType: 'super_admin',
        eventType: 'company.suspended', resourceType: 'company', resourceId: id,
        metadata: { reason: suspensionReason },
      })
      return NextResponse.json({ message: 'Company suspended' })
    }

    if (action === 'activate') {
      await (svc as any).from('companies').update({
        status: 'active',
        is_active: true,
        suspension_reason: null,
        updated_at: new Date().toISOString(),
      } as any).eq('id', id)
      await emitEvent({
        actorId: adminUserId, actorType: 'super_admin',
        eventType: 'company.activated', resourceType: 'company', resourceId: id,
      })
      return NextResponse.json({ message: 'Company activated' })
    }

    if (action === 'delete') {
      await softDelete('companies', id, adminUserId)
      await (svc as any).from('companies').update({ status: 'deleted', is_active: false } as any).eq('id', id)
      await emitEvent({
        actorId: adminUserId, actorType: 'super_admin',
        eventType: 'company.deleted', resourceType: 'company', resourceId: id,
      })
      return NextResponse.json({ message: 'Company deleted (soft)' })
    }

    return NextResponse.json({ error: 'Unknown action', code: 'UNKNOWN_ACTION' }, { status: 400 })
  })(req)
}
