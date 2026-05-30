import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

// POST /api/portal/token — Generate a shareable deal room token
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { deal_id, company_id } = await req.json()
    if (!deal_id || !company_id) return NextResponse.json({ error: 'deal_id, company_id required', code: 'MISSING' }, { status: 400 })

    const supabase = createServiceClient()

    // Upsert — return existing token if already created for this deal
    const { data: existing } = await (supabase as any)
      .from('deal_portal_tokens')
      .select('id, token, expires_at')
      .eq('deal_id', deal_id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existing) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://klinqcrm.in'
      return NextResponse.json({ token: (existing as any).token, url: `${appUrl}/portal/${(existing as any).token}` })
    }

    const { data, error } = await (supabase as any).from('deal_portal_tokens').insert({
      deal_id, company_id, created_by: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message, code: 'INSERT_FAILED' }, { status: 500 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const portalUrl = `${appUrl}/portal/${(data as any).token}`

    await logAudit({ req, supabase, companyId: company_id, userId: user.id, userEmail: user.email || '',
      action: 'portal.token_created', entityType: 'deal', entityId: deal_id, newValue: { token: (data as any).token } })

    return NextResponse.json({ token: (data as any).token, url: portalUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
