import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

async function getSuperAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const svc = createServiceClient()
  const { data: admin } = await svc.from('platform_admins').select('is_active').eq('user_id', user.id).maybeSingle()
  const metaFlag = user.user_metadata?.is_platform_admin === true
  if (!admin?.is_active && !metaFlag) return null
  return user
}

// GET /api/super-admin/settings
export async function GET(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data: settings } = await (svc as any)
    .from('platform_settings')
    .select('*')
    .single()

  return NextResponse.json({ settings: settings ?? null })
}

// PATCH /api/super-admin/settings
export async function PATCH(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const svc = createServiceClient()

  // Upsert platform settings (assumes single-row table)
  const { error } = await (svc as any).from('platform_settings').upsert({
    id: 1, // singleton row
    ...body,
    updated_at: new Date().toISOString(),
    updated_by: adminUser.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (svc as any).from('audit_logs').insert({
    action: 'platform.settings_updated',
    resource: 'platform_settings',
    user_id: adminUser.id,
    details: { by: adminUser.email },
  })

  return NextResponse.json({ success: true })
}
