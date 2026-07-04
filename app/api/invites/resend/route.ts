import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, teamInviteEmailHtml } from '@/lib/email'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

// POST /api/invites/resend — Refresh token, reset expiry, resend email
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { inviteId } = await req.json()
    if (!inviteId) return NextResponse.json({ error: 'inviteId required' }, { status: 400 })

    const svc = createServiceClient()

    // Verify the caller is an admin of the company that owns this invite
    const { data: invite } = await svc
      .from('invites')
      .select('*, company:companies(name)')
      .eq('id', inviteId)
      .single()

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

    const { data: member } = await svc
      .from('company_members')
      .select('role')
      .eq('company_id', invite.company_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!member || !['owner', 'admin', 'manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Rate limit: prevent spam resending
    const rl = checkRateLimit('email', invite.company_id)
    const denied = rateLimitResponse(rl)
    if (denied) return denied

    // Generate new token, reset expiry
    const crypto = require('crypto')
    const newToken = crypto.randomBytes(32).toString('hex')
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: updateError } = await svc.from('invites').update({
      token: newToken,
      expires_at: newExpiry,
    }).eq('id', inviteId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update invite: ' + updateError.message }, { status: 500 })
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${newToken}`
    const company = invite.company as any

    // Get inviter profile
    const { data: inviterProfile } = await svc
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Send email — surface errors to the caller instead of hiding them
    const emailResult = await sendEmail({
      to: invite.email,
      subject: `You've been invited to join ${company?.name ?? 'Klinq CRM'}`,
      html: teamInviteEmailHtml({
        companyName: company?.name ?? 'Klinq CRM',
        inviterName: inviterProfile?.full_name ?? 'Your Admin',
        role: invite.role,
        inviteUrl,
        expiryDays: 7,
      }),
    })

    if (!emailResult.success) {
      return NextResponse.json({
        message: `Invite token refreshed, but email failed to send: ${emailResult.error}`,
        inviteId,
        emailFailed: true,
        emailError: emailResult.error,
      })
    }

    return NextResponse.json({ message: `Invite resent to ${invite.email}` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}

