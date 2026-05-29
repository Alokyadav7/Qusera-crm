import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { checkPermission } from '@/lib/permissions'

// GET /api/sequences?company_id=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const company_id = searchParams.get('company_id')
    if (!company_id) return NextResponse.json({ error: 'company_id required', code: 'MISSING' }, { status: 400 })

    const supabase = createServiceClient()
    const { data, error } = await (supabase as any)
      .from('sequences')
      .select('*, steps:sequence_steps(count), enrollments:sequence_enrollments(count)')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message, code: 'FETCH_FAILED' }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// POST /api/sequences — Create sequence with steps
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()
    const { company_id, name, description, steps } = body
    if (!company_id || !name) return NextResponse.json({ error: 'company_id, name required', code: 'MISSING' }, { status: 400 })

    const { allowed } = await checkPermission(user.id, company_id, 'sequences.manage')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()

    const { data: seq, error: seqErr } = await (supabase as any).from('sequences').insert({
      company_id, name, description: description || null,
      is_active: true, created_by: user.id,
      created_at: new Date().toISOString(),
    }).select().single()

    if (seqErr) return NextResponse.json({ error: seqErr.message, code: 'INSERT_FAILED' }, { status: 500 })

    // Insert steps
    if (steps?.length) {
      const stepRows = (steps as any[]).map((s: any, i: number) => ({
        sequence_id: (seq as any).id,
        step_number: i + 1,
        delay_days: s.delay_days ?? i * 3,
        subject: s.subject,
        body_html: s.body_html,
        from_name: s.from_name || null,
        from_email: s.from_email || null,
      }))
      await (supabase as any).from('sequence_steps').insert(stepRows)
    }

    await logAudit({ req, supabase, companyId: company_id, userId: user.id, userEmail: user.email || '',
      action: 'sequence.created', entityType: 'sequence', entityId: (seq as any).id,
      newValue: { name, step_count: steps?.length ?? 0 } })

    return NextResponse.json({ data: seq })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
