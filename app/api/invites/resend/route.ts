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

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${newToken}`
  const company = invite.company as any

  // Queue resend email
  const { enqueueJob } = await import('@/lib/jobs/enqueue')
  await enqueueJob({
    companyId: invite.company_id,
    type: 'send_email',
    payload: {
      to: invite.email,
      template: 'team_invite',
      data: {
        companyName: company?.name ?? 'Your Team',
        role: invite.role,
        inviteUrl,
        expiresInDays: 7,
      },
    },
    priority: 8,
    createdBy: user.id,
  })

  return NextResponse.json({ message: `Invite resent to ${invite.email}` })
}
