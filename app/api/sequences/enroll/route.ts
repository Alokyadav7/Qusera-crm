import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/sequences/enroll — Enroll a lead or contact into a sequence
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { sequence_id, lead_id, contact_id, company_id } = await req.json()
    if (!sequence_id || !company_id || (!lead_id && !contact_id)) {
      return NextResponse.json({ error: 'sequence_id, company_id, and lead_id or contact_id required', code: 'MISSING' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Check not already enrolled
    const { data: existing } = await (supabase as any).from('sequence_enrollments')
      .select('id, status')
      .eq('sequence_id', sequence_id)
      .eq(lead_id ? 'lead_id' : 'contact_id', lead_id || contact_id)
      .maybeSingle()

    if ((existing as any)?.status === 'active') {
      return NextResponse.json({ error: 'Already enrolled in this sequence', code: 'ALREADY_ENROLLED' }, { status: 409 })
    }

    // Get first step to determine first send time
    const { data: firstStep } = await (supabase as any).from('sequence_steps')
      .select('delay_days').eq('sequence_id', sequence_id).order('step_number').limit(1).single()

    const nextSendAt = new Date()
    nextSendAt.setDate(nextSendAt.getDate() + ((firstStep as any)?.delay_days ?? 0))

    const { data, error } = await (supabase as any).from('sequence_enrollments').upsert({
      sequence_id,
      lead_id: lead_id || null,
      contact_id: contact_id || null,
      company_id,
      current_step: 1,
      status: 'active',
      enrolled_at: new Date().toISOString(),
      next_send_at: nextSendAt.toISOString(),
    }, { onConflict: 'sequence_id,lead_id' }).select().single()

    if (error) return NextResponse.json({ error: error.message, code: 'ENROLL_FAILED' }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
