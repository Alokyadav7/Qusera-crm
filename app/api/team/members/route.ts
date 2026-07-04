import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

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

// NOTE: POST (invite) is handled by /api/invites/send — do not duplicate here.
