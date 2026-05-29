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

// GET /api/super-admin/companies/[id]/members — list all members with profile info
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const svc = createServiceClient()

  // Fetch members with their profile data joined
  const { data: members, error } = await svc
    .from('company_members')
    .select('id, user_id, role, is_active, joined_at, deleted_at')
    .eq('company_id', id)
    .is('deleted_at', null)
    .order('joined_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with auth user data (email, display name)
  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      try {
        const { data: { user } } = await svc.auth.admin.getUserById(m.user_id)
        return {
          ...m,
          email: user?.email ?? null,
          full_name: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null,
          last_sign_in: user?.last_sign_in_at ?? null,
        }
      } catch {
        return { ...m, email: null, full_name: null, last_sign_in: null }
      }
    })
  )

  return NextResponse.json({ members: enriched })
}

// PATCH /api/super-admin/companies/[id]/members — update member role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { member_id, role } = await req.json()
  if (!member_id || !role) return NextResponse.json({ error: 'member_id and role required' }, { status: 400 })

  const svc = createServiceClient()
  const { error } = await (svc as any).from('company_members').update({ role }).eq('id', member_id).eq('company_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/super-admin/companies/[id]/members — remove member
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { member_id } = await req.json()
  if (!member_id) return NextResponse.json({ error: 'member_id required' }, { status: 400 })

  const svc = createServiceClient()
  const { error } = await (svc as any)
    .from('company_members')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', member_id)
    .eq('company_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (svc as any).from('audit_logs').insert({
    action: 'company_member.removed',
    resource: 'company_member',
    user_id: adminUser.id,
    company_id: id,
    details: { by: adminUser.email, member_id },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
