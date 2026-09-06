import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// POST /api/super-admin/impersonate
// Start impersonating a company (super admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 10 impersonations per hour per admin
  const rl = rateLimit({ key: `impersonate:${user.id}`, limit: 10, windowMs: 60 * 60_000 })
  const denied = rateLimitResponse(rl)
  if (denied) return denied


  // Verify super admin
  const svc = createServiceClient()
  const { data: admin } = await svc
    .from('platform_admins')
    .select('is_active')
    .eq('user_id', user.id)
    .single()

  if (!admin?.is_active) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
  }

  const body = await req.json()
  const { companyId, targetUserId, reason } = body

  if (!companyId || !reason?.trim()) {
    return NextResponse.json({ error: 'companyId and reason are required' }, { status: 400 })
  }

  // Verify company exists
  const { data: company } = await svc.from('companies').select('id, name').eq('id', companyId).single()
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Create impersonation session
  const { data: session, error } = await svc
    .from('impersonation_sessions')
    .insert({
      super_admin_id: user.id,
      target_company_id: companyId,
      target_user_id: targetUserId ?? null,
      reason: reason.trim(),
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    })
    .select('id')
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Failed to create impersonation session' }, { status: 500 })
  }

  await emitEvent({
    actorId: user.id,
    actorType: 'super_admin',
    eventType: 'impersonation.started',
    companyId,
    metadata: { reason, sessionId: session.id, companyName: company.name },
  })

  // Set impersonation cookie
  const response = NextResponse.json({
    message: 'Impersonation started',
    sessionId: session.id,
    companyName: company.name,
  })

  response.cookies.set('x-impersonation-session', session.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours max
  })

  // Set active company for the session
  await svc.from('user_active_company').upsert({
    user_id: user.id,
    company_id: companyId,
    workspace_id: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return response
}
