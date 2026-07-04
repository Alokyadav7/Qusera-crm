import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'
import { logAudit } from '@/lib/audit'
import { sendEmail, teamInviteEmailHtml } from '@/lib/email'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

// POST /api/invites/send
export const POST = withTenantAuth(
  async (req: NextRequest, ctx) => {
    // Rate limit: max 20 invites per hour per company
    const rl = checkRateLimit('email', ctx.companyId)
    const denied = rateLimitResponse(rl)
    if (denied) return denied
    try {
      const body = await req.json()
      const { email, role: rawRole, fullName, department } = body

      if (!email || !rawRole || !fullName) {
        return NextResponse.json({ error: 'email, role, and fullName are required' }, { status: 400 })
      }

      // Map UI roles to database CHECK constraint allowed roles
      let role = rawRole
      if (role === 'company_admin') role = 'admin'
      else if (role === 'sales_manager') role = 'manager'
      else if (role === 'sales_rep') role = 'sales'

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      }

      const svc = createServiceClient()

      // Get company info
      const { data: company } = await svc
        .from('companies')
        .select('id, name, logo_url')
        .eq('id', ctx.companyId)
        .single()

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
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

      let userId: string
      let isNewUser = false

      // Check if auth user already exists using profiles lookup and then getUserById
      const { data: existingProfile } = await svc
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      let existingAuthUser = null
      if (existingProfile) {
        const { data: authData } = await svc.auth.admin.getUserById(existingProfile.id)
        existingAuthUser = authData?.user ?? null
      }

      if (existingAuthUser) {
        userId = existingAuthUser.id
        // Check if already active in this company
        const { data: existingMember } = await svc
          .from('company_members')
          .select('id')
          .eq('company_id', ctx.companyId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle()

        if (existingMember) {
          return NextResponse.json({ error: 'User is already a member of this company' }, { status: 409 })
        }
      } else {
        // Create user atomically
        isNewUser = true
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
        const { data: authData, error: authError } = await svc.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            company_id: ctx.companyId,
          },
        })

        if (authError || !authData?.user) {
          return NextResponse.json({ error: 'Failed to create auth user: ' + (authError?.message ?? 'Unknown error') }, { status: 500 })
        }
        userId = authData.user.id
      }

      // Upsert profile
      await (svc.from('profiles') as any).upsert({
        id: userId,
        full_name: fullName,
        email: email.toLowerCase(),
        role,
        company_id: ctx.companyId,
        is_active: true,
        onboarding_completed: false, // will complete when password is set
        temp_password_used: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      // Create/Upsert company member (as inactive/pending until accepted)
      await (svc.from('company_members') as any).upsert({
        company_id: ctx.companyId,
        user_id: userId,
        role,
        is_active: false,
        invited_by: ctx.userId,
      }, { onConflict: 'company_id,user_id' })

      // Set/Upsert active company
      await (svc.from('user_active_company') as any).upsert({
        user_id: userId,
        company_id: ctx.companyId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Generate invite token
      const token = require('crypto').randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      // Delete any previous pending invites for this email in this company
      await svc.from('invites')
        .delete()
        .eq('company_id', ctx.companyId)
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)

      const { data: invite, error: inviteError } = await (svc.from('invites') as any)
        .insert({
          company_id: ctx.companyId,
          email: email.toLowerCase(),
          role,
          invited_by: ctx.userId,
          token,
          expires_at: expiresAt,
        })
        .select('id, token')
        .single()

      if (inviteError || !invite) {
        return NextResponse.json({ error: 'Failed to create invite token: ' + inviteError?.message }, { status: 500 })
      }

      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${invite.token}`

      // Get inviter profile
      const { data: inviter } = await svc
        .from('profiles')
        .select('full_name')
        .eq('id', ctx.userId)
        .maybeSingle()

      // Send email directly
      const emailResult = await sendEmail({
        to: email,
        subject: `You've been invited to join ${company.name}`,
        html: teamInviteEmailHtml({
          companyName: company.name,
          inviterName: inviter?.full_name ?? 'An administrator',
          role,
          inviteUrl,
          expiryDays: 7,
        })
      })

      if (!emailResult.success) {
        console.error('[INVITE] Email send failed:', emailResult.error)
        return NextResponse.json({
          message: `Invite created in DB, but email failed: ${emailResult.error}`,
          inviteId: invite.id,
          emailError: emailResult.error,
        })
      }

      // Emit event
      await emitEvent({
        companyId: ctx.companyId,
        actorId: ctx.userId,
        eventType: 'invite.sent',
        resourceType: 'invite',
        resourceId: invite.id,
        resourceLabel: email,
        metadata: { role, email, isNewUser },
      })

      // Log audit
      await logAudit({
        req,
        supabase: svc,
        companyId: ctx.companyId,
        userId: ctx.userId,
        userEmail: ctx.userEmail ?? '',
        action: 'team.member_invited',
        entityType: 'invite',
        entityId: invite.id,
        newValue: { email, role, fullName, department },
      })

      return NextResponse.json({
        message: `Invite sent to ${email}`,
        inviteId: invite.id,
      })
    } catch (err: any) {
      console.error('[Invite API Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin', 'manager'] }
)
