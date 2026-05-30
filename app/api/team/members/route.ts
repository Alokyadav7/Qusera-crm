import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkPermission } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'
import { sendEmail, teamInviteEmailHtml } from '@/lib/email'

// GET /api/team/members — List all company members with roles
export async function GET(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    if (!companyId) return NextResponse.json({ error: 'company_id required', code: 'MISSING' }, { status: 400 })

    const supabase = createServiceClient()
    const { data, error } = await (supabase as any)
      .from('company_members')
      .select(`
        id, role, is_active, joined_at, invited_by,
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq('company_id', companyId)
      .order('joined_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message, code: 'FETCH_FAILED' }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// POST /api/team/members — Invite a new member by email
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()
    const { company_id, email, role } = body
    if (!company_id || !email || !role) {
      return NextResponse.json({ error: 'company_id, email, role required', code: 'MISSING' }, { status: 400 })
    }

    const { allowed } = await checkPermission(user.id, company_id, 'team.manage')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()

    // Check if user already exists in auth
    const { data: existingProfile } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .single()

    // Send invite email via Gmail SMTP
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://klinqcrm.in'}/login`
    const { data: inviterProfile } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    const { data: companyData } = await (supabase as any)
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single()

    sendEmail({
      to: email,
      subject: `You've been invited to join ${companyData?.name ?? 'Klinq CRM'}`,
      html: teamInviteEmailHtml({
        companyName: companyData?.name ?? 'Klinq CRM',
        inviterName: inviterProfile?.full_name ?? 'Your admin',
        role,
        inviteUrl,
      }),
    }).catch(err => console.error('[Invite Email] Failed:', err?.message))

    // If user exists, add them directly to company_members
    if ((existingProfile as any)?.id) {
      const { data: member, error: memberErr } = await (supabase as any)
        .from('company_members')
        .upsert({
          company_id,
          user_id: (existingProfile as any).id,
          role,
          is_active: true,
          invited_by: user.id,
          joined_at: new Date().toISOString(),
        }, { onConflict: 'company_id,user_id' })
        .select()
        .single()

      if (memberErr) return NextResponse.json({ error: memberErr.message, code: 'INSERT_FAILED' }, { status: 500 })

      await logAudit({ req, supabase, companyId: company_id, userId: user.id, userEmail: user.email || '',
        action: 'team.member_invited', entityType: 'company_member', entityId: (member as any).id,
        newValue: { email, role } })

      return NextResponse.json({ data: member, invited: false })
    }

    // User doesn't exist yet — store pending invite
    const { data: invite, error: inviteErr } = await (supabase as any)
      .from('team_invites')
      .insert({ company_id, email, role, invited_by: user.id, created_at: new Date().toISOString() })
      .select().single()

    if (inviteErr) return NextResponse.json({ error: inviteErr.message, code: 'INVITE_FAILED' }, { status: 500 })
    return NextResponse.json({ data: invite, invited: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
