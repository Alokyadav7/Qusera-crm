import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/impersonate/status
// Check if current session is impersonating
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ active: false })

  const sessionId = req.cookies.get('x-impersonation-session')?.value
  if (!sessionId) return NextResponse.json({ active: false })

  const svc = createServiceClient()
  const { data: session } = await svc
    .from('impersonation_sessions')
    .select('target_company_id, company:companies(name)')
    .eq('id', sessionId)
    .eq('super_admin_id', user.id)
    .is('ended_at', null)
    .single()

  if (!session) return NextResponse.json({ active: false })

  return NextResponse.json({
    active: true,
    companyName: (session.company as any)?.name ?? 'Unknown Company',
  })
}
