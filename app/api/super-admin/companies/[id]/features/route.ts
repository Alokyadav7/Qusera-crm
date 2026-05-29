import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'

// POST /api/super-admin/companies/[id]/features
// Toggle a feature override for a company
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(async (request, adminUserId) => {
    const { id } = await params
    const body = await request.json()
    const { featureKey, isEnabled, reason, expiresAt } = body

    if (!featureKey || isEnabled === undefined) {
      return NextResponse.json({ error: 'featureKey and isEnabled required' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Upsert the override
    const { error } = await svc.from('company_feature_overrides').upsert({
      company_id: id,
      feature_key: featureKey,
      is_enabled: isEnabled,
      reason: reason ?? null,
      enabled_by: adminUserId,
      expires_at: expiresAt ?? null,
    }, { onConflict: 'company_id,feature_key' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await emitEvent({
      actorId: adminUserId,
      actorType: 'super_admin',
      eventType: 'feature.toggled',
      companyId: id,
      metadata: { featureKey, isEnabled, reason },
    })

    return NextResponse.json({ message: `Feature '${featureKey}' ${isEnabled ? 'enabled' : 'disabled'}` })
  })(req)
}
