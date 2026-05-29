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

// PATCH /api/super-admin/companies/[id]/edit — update company name/slug/status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const allowedFields = ['name', 'slug', 'status', 'owner_email', 'industry', 'plan']
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const svc = createServiceClient()
  const { error } = await (svc as any).from('companies').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (svc as any).from('audit_logs').insert({
    action: 'company.updated',
    resource: 'company',
    user_id: adminUser.id,
    company_id: id,
    details: { by: adminUser.email, changes: updates },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}

// DELETE /api/super-admin/companies/[id]/edit — soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const svc = createServiceClient()

  const { error } = await (svc as any).from('companies').update({
    deleted_at: new Date().toISOString(),
    is_active: false,
    status: 'canceled',
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (svc as any).from('audit_logs').insert({
    action: 'company.deleted',
    resource: 'company',
    user_id: adminUser.id,
    company_id: id,
    details: { by: adminUser.email, note: 'Soft delete via super-admin panel' },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
