import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

// POST /api/invites/resend — Refresh token, reset expiry, resend email
export async function POST(req: NextRequest) {
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

  // Generate new token, reset expiry
  const newToken = require('crypto').randomBytes(32).toString('hex')
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await svc.from('invites').update({
    token: newToken,
    expires_at: newExpiry,
  }).eq('id', inviteId)

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://klinqcrm.in'}/invite/${newToken}`
  const company = invite.company as any

  // Send email directly
  const { data: inviterProfile } = await svc
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const { sendEmail, teamInviteEmailHtml } = await import('@/lib/email')

  const emailResult = await sendEmail({
    to: invite.email,
    subject: `You've been invited to join ${company?.name ?? 'Your Team'} on Klinq CRM`,
    html: teamInviteEmailHtml({
      companyName: company?.name ?? 'Your Team',
      inviterName: inviterProfile?.full_name ?? 'Your admin',
      role: invite.role,
      inviteUrl,
      expiryDays: 7,
    }),
  })

  if (!emailResult.success) {
    return NextResponse.json({ error: 'Failed to send invitation email: ' + emailResult.error }, { status: 500 })
  }

  return NextResponse.json({ message: `Invite resent to ${invite.email}` })
}
