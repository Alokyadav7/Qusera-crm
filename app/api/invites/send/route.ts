import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'
import { enqueueJob } from '@/lib/jobs/enqueue'

// POST /api/invites/send
export const POST = withTenantAuth(
  async (req: NextRequest, ctx) => {
    const body = await req.json()
    const { email, role, workspaceId } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Get company info for the email
    const { data: company } = await svc
      .from('companies')
      .select('id, name, logo_url')
      .eq('id', ctx.companyId)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if user is already a member
    const { data: existingMember } = await svc
      .from('company_members')
      .select('id')
      .eq('company_id', ctx.companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this company' }, { status: 409 })
    }

    // Check for existing pending invite
    const { data: existingInvite } = await svc
      .from('invites')
      .select('id, expires_at')
      .eq('company_id', ctx.companyId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'A pending invite already exists for this email. Use resend to send again.' }, { status: 409 })
    }

    // Check plan limit: max_users
    const { count: currentMemberCount } = await svc
      .from('company_members')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', ctx.companyId)
      .eq('is_active', true)
      .is('deleted_at', null)

    // Get plan limit
    const { data: sub } = await svc.from('subscriptions').select('plan_id').eq('company_id', ctx.companyId).single()
    if (sub) {
      const { data: limit } = await svc.from('plan_limits').select('limit_value').eq('plan_id', sub.plan_id).eq('feature_key', 'max_users').single()
      if (limit && limit.limit_value !== -1 && (currentMemberCount ?? 0) >= limit.limit_value) {
        return NextResponse.json({ error: `User limit reached (${currentMemberCount}/${limit.limit_value}). Upgrade your plan to invite more members.` }, { status: 402 })
      }
    }

    // Create invite
    const { data: invite, error } = await svc
      .from('invites')
      .insert({
        company_id: ctx.companyId,
        workspace_id: workspaceId ?? null,
        email: email.toLowerCase(),
        role,
        invited_by: ctx.userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id, token')
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Failed to create invite: ' + error?.message }, { status: 500 })
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://klinqcrm.in'}/invite/${invite.token}`

    // Queue email (non-blocking)
    await enqueueJob({
      companyId: ctx.companyId,
      type: 'send_email',
      payload: {
        to: email,
        template: 'team_invite',
        data: {
          companyName: company.name,
          role,
          inviteUrl,
          expiresInDays: 7,
        },
      },
      priority: 8,
      createdBy: ctx.userId,
    })

    // Emit event
    await emitEvent({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      eventType: 'invite.sent',
      resourceType: 'invite',
      resourceId: invite.id,
      resourceLabel: email,
      metadata: { role, email },
    })

    return NextResponse.json({
      message: `Invite sent to ${email}`,
      inviteId: invite.id,
    })
  },
  { requiredRoles: ['owner', 'admin', 'manager'] }
)
