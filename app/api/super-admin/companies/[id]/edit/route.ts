import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'

// PATCH /api/super-admin/companies/[id]/edit — update company name/slug/status/plan/owner_email
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(async (request, adminUserId) => {
    const { id } = await params
    const body = await request.json()

    const svc = createServiceClient()

    // 1. Handle Owner Email update if provided
    if (body.owner_email !== undefined) {
      const newEmail = body.owner_email.trim().toLowerCase()
      if (newEmail) {
        // Fetch company owner_id
        const { data: companyData } = await svc
          .from('companies')
          .select('owner_id')
          .eq('id', id)
          .single()

        let ownerId = companyData?.owner_id

        // Fallback: check company_members where role is owner
        if (!ownerId) {
          const { data: memberData } = await svc
            .from('company_members')
            .select('user_id')
            .eq('company_id', id)
            .eq('role', 'owner')
            .is('deleted_at', null)
            .maybeSingle()
          
          ownerId = memberData?.user_id
        }

        if (ownerId) {
          // Update email in Auth
          const { error: authError } = await svc.auth.admin.updateUserById(ownerId, {
            email: newEmail,
          })
          if (authError) {
            return NextResponse.json(
              { error: `Failed to update auth user email: ${authError.message}` },
              { status: 500 }
            )
          }

          // Update email in profiles table
          const { error: profileError } = await (svc as any)
            .from('profiles')
            .update({ email: newEmail, updated_at: new Date().toISOString() })
            .eq('id', ownerId)
          if (profileError) {
            return NextResponse.json(
              { error: `Failed to update profile email: ${profileError.message}` },
              { status: 500 }
            )
          }
        }
      }
    }

    // 2. Prepare company fields updates
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    const allowedCompanyFields = ['name', 'slug', 'status', 'industry']
    for (const key of allowedCompanyFields) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    // Handle plan & plan_id (update both columns for robustness)
    if (body.plan !== undefined) {
      updates.plan = body.plan
      updates.plan_id = body.plan
    }

    // Only update if there are fields to update (besides updated_at)
    if (Object.keys(updates).length > 1) {
      const { error } = await (svc as any).from('companies').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get admin details for audit log
    const { data: adminProfile } = await (svc as any)
      .from('profiles')
      .select('email')
      .eq('id', adminUserId)
      .maybeSingle()

    try {
      await svc.from('audit_logs').insert({
        action: 'company.updated',
        resource: 'company',
        user_id: adminUserId,
        company_id: id,
        details: { by: (adminProfile as any)?.email ?? 'Super Admin', changes: { ...updates, owner_email: body.owner_email } },
      } as any)
    } catch (e) {
      console.error('[Audit Log] Failed to insert update log:', e)
    }

    return NextResponse.json({ success: true })
  })(req)
}

// DELETE /api/super-admin/companies/[id]/edit — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withSuperAdmin(async (request, adminUserId) => {
    const { id } = await params
    const svc = createServiceClient()

    const { error } = await svc.from('companies').update({
      deleted_at: new Date().toISOString(),
      deleted_by: adminUserId,
      is_active: false,
      status: 'deleted',
      updated_at: new Date().toISOString(),
    } as any).eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: adminProfile } = await (svc as any)
      .from('profiles')
      .select('email')
      .eq('id', adminUserId)
      .maybeSingle()

    try {
      await svc.from('audit_logs').insert({
        action: 'company.deleted',
        resource: 'company',
        user_id: adminUserId,
        company_id: id,
        details: { by: (adminProfile as any)?.email ?? 'Super Admin', note: 'Soft delete via super-admin panel' },
      } as any)
    } catch (e) {
      console.error('[Audit Log] Failed to insert delete log:', e)
    }

    return NextResponse.json({ success: true })
  })(req)
}
