import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'

// POST /api/super-admin/impersonate/end
// End an active impersonation session
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionId = req.cookies.get('x-impersonation-session')?.value
  if (!sessionId) {
    return NextResponse.json({ error: 'No active impersonation session' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Close the session
  const { data: session } = await svc
    .from('impersonation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('super_admin_id', user.id)
    .select('target_company_id')
    .single()

  if (session) {
    await emitEvent({
      actorId: user.id,
      actorType: 'super_admin',
      eventType: 'impersonation.ended',
      companyId: session.target_company_id,
      metadata: { sessionId },
    })
  }

  const response = NextResponse.json({ message: 'Impersonation ended' })

  // Clear the impersonation cookie
  response.cookies.set('x-impersonation-session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
