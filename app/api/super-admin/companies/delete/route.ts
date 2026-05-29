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

// POST /api/super-admin/companies/delete
export async function POST(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id } = await req.json()
  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  const svc = createServiceClient()
  const { error } = await (svc as any).from('companies').update({
    deleted_at: new Date().toISOString(),
    is_active: false,
    status: 'canceled',
    updated_at: new Date().toISOString(),
  }).eq('id', company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (svc as any).from('audit_logs').insert({
    action: 'company.deleted',
    resource: 'company',
    user_id: adminUser.id,
    company_id,
    details: { by: adminUser.email, note: 'Soft delete — data retained 30 days' },
  })

  return NextResponse.json({ success: true })
}
