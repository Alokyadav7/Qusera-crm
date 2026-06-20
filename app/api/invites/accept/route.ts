import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'

// POST /api/invites/accept
// Called from the invite acceptance page — public (no auth required yet)
export async function POST(req: NextRequest) {
  try {
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

    // Check if auth user already exists
    const { data: authSearch } = await svc.auth.admin.listUsers()
    const authUser = authSearch?.users?.find(u => u.email?.toLowerCase() === invite.email.toLowerCase())
    let userId: string

    if (authUser) {
      userId = authUser.id
      // Update password for existing user
      const { error: updateError } = await svc.auth.admin.updateUserById(userId, {
        password: password,
        user_metadata: { full_name: fullName }
      })
      if (updateError) {
        return NextResponse.json({ error: 'Failed to update user password: ' + updateError.message }, { status: 500 })
      }
    } else {
      // Create user if they somehow don't exist
      const { data: authData, error: authError } = await svc.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          company_id: invite.company_id,
        },
      })

      if (authError || !authData?.user) {
        if (authError?.message.includes('already registered')) {
          return NextResponse.json({ error: 'An account with this email already exists. Try logging in.' }, { status: 409 })
        }
        return NextResponse.json({ error: authError?.message ?? 'Failed to create user' }, { status: 500 })
      }
      userId = authData.user.id
    }

    // Update profile record
    await (svc.from('profiles') as any).upsert({
      id: userId,
      full_name: fullName,
      email: invite.email,
      role: invite.role,
      company_id: invite.company_id,
      is_active: true,
      onboarding_completed: true,   // Team members skip onboarding wizard
      temp_password_used: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Activate company member record
    const { error: memberError } = await (svc.from('company_members') as any).upsert({
      company_id: invite.company_id,
      user_id: userId,
      role: invite.role,
      is_active: true,
      invited_by: invite.invited_by,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'company_id,user_id' })

    if (memberError) {
      return NextResponse.json({ error: 'Failed to update member status: ' + memberError.message }, { status: 500 })
    }

    // Set active company
    await (svc.from('user_active_company') as any).upsert({
      user_id: userId,
      company_id: invite.company_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Mark invite as accepted
    await svc.from('invites').update({
      accepted_at: new Date().toISOString(),
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
  } catch (err: any) {
    console.error('[Accept Invite Error]:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
