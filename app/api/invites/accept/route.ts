import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'

// POST /api/invites/accept
// Called from the invite acceptance page — public (no auth required yet)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, password, fullName } = body

  if (!token || !password || !fullName) {
    return NextResponse.json({ error: 'token, password, and fullName are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Validate invite token
  const { data: invite } = await svc
    .from('invites')
    .select('*, company:companies(id, name)')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired. Ask your admin to resend it.' }, { status: 410 })
  }

  // Create Supabase auth user
  const { data: authData, error: authError } = await svc.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company_id: invite.company_id,
    },
  })

  if (authError) {
    // User might already exist — try to find them
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'An account with this email already exists. Try logging in.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // Create profile record — team members skip onboarding wizard (admin already set up company)
  await (svc as any).from('profiles').upsert({
    id: userId,
    full_name: fullName,
    role: invite.role,
    company_id: invite.company_id,
    is_active: true,
    onboarding_completed: true,   // Team members skip wizard — go straight to /dashboard
    temp_password_used: true,     // They set their own password at invite acceptance
  }, { onConflict: 'id' })


  // Add as company member
  const { error: memberError } = await (svc as any).from('company_members').insert({
    company_id: invite.company_id,
    workspace_id: invite.workspace_id ?? null,
    user_id: userId,
    role: invite.role,
    is_active: true,
    invited_by: invite.invited_by,
    invited_at: invite.created_at,
    joined_at: new Date().toISOString(),
  })

  if (memberError) {
    return NextResponse.json({ error: 'Failed to add member: ' + memberError.message }, { status: 500 })
  }

  // Set active company
  await svc.from('user_active_company').upsert({
    user_id: userId,
    company_id: invite.company_id,
    workspace_id: invite.workspace_id ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Mark invite as accepted
  await svc.from('invites').update({
    accepted_at: new Date().toISOString(),
    accepted_by: userId,
  }).eq('token', token)

  // Emit events
  await emitEvent({
    companyId: invite.company_id,
    actorId: userId,
    eventType: 'invite.accepted',
    resourceType: 'invite',
    resourceId: invite.id,
    resourceLabel: invite.email,
  })
  await emitEvent({
    companyId: invite.company_id,
    actorId: userId,
    eventType: 'member.joined',
    resourceType: 'member',
    resourceId: userId,
    resourceLabel: fullName,
    metadata: { role: invite.role, email: invite.email },
  })

  return NextResponse.json({
    message: 'Account created successfully',
    email: invite.email,
    companyName: (invite.company as any)?.name,
  })
}
