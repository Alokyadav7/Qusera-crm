import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkPermission } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

interface Ctx { params: Promise<{ id: string }> }

// PATCH /api/team/members/[id] — Update role or deactivate
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()
    const { company_id, role, is_active } = body
    if (!company_id) return NextResponse.json({ error: 'company_id required', code: 'MISSING' }, { status: 400 })

    const { allowed } = await checkPermission(user.id, company_id, 'team.manage')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()
    const updates: Record<string, unknown> = {}
    if (role !== undefined) updates.role = role
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await (supabase as any)
      .from('company_members')
      .update(updates)
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message, code: 'UPDATE_FAILED' }, { status: 500 })

    await logAudit({ req, supabase, companyId: company_id, userId: user.id, userEmail: user.email || '',
      action: is_active === false ? 'team.member_deactivated' : 'team.member_role_changed',
      entityType: 'company_member', entityId: id, newValue: updates })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// DELETE /api/team/members/[id] — Remove member
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const company_id = searchParams.get('company_id') || ''
    const { allowed } = await checkPermission(user.id, company_id, 'team.manage')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()
    const { error } = await (supabase as any).from('company_members').delete()
      .eq('id', id).eq('company_id', company_id)
    if (error) return NextResponse.json({ error: error.message, code: 'DELETE_FAILED' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
