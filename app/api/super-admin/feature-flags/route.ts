import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH /api/super-admin/feature-flags
// Body: { plan_id: string, feature_key: string, enabled: boolean }
export async function PATCH(req: NextRequest) {
  try {
    // Auth: must be platform admin
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = createServiceClient()

    // Verify platform admin
    const { data: adminRecord } = await svc
      .from('platform_admins')
      .select('is_active')
      .eq('user_id', user.id)
      .single()

    const metaFlag =
      user.user_metadata?.is_platform_admin === true ||
      (user as any).app_metadata?.is_platform_admin === true

    if (!adminRecord?.is_active && !metaFlag) {
      return NextResponse.json({ error: 'Forbidden: platform admin required' }, { status: 403 })
    }

    const body = await req.json()
    const { plan_id, feature_key, enabled } = body

    if (!plan_id || !feature_key || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields: plan_id, feature_key, enabled' }, { status: 400 })
    }

    // Upsert into plan_features
    const { data, error } = await (svc as any)
      .from('plan_features')
      .upsert(
        { plan_id, feature_key, is_enabled: enabled, updated_at: new Date().toISOString() },
        { onConflict: 'plan_id,feature_key' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await (svc as any).from('activity_events').insert({
      event_type: 'feature.toggled',
      actor_type: 'platform_admin',
      actor_id: user.id,
      resource_type: 'feature_flag',
      resource_label: `${feature_key} → ${enabled ? 'enabled' : 'disabled'} on plan ${plan_id}`,
      metadata: { plan_id, feature_key, enabled, changed_by: user.id },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 })
  }
}
