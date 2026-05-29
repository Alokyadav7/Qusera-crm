import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

// POST /api/leads — Create a lead with company_id stamped automatically
export async function POST(req: NextRequest) {
  try {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()
    const supabase = createServiceClient()

    // Lookup active company for this user
    const { data: uac } = await (supabase as any)
      .from('user_active_company')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    const lead = {
      user_id: user.id,
      company_id: (uac as any)?.company_id || null,
      full_name: body.full_name,
      phone_number: body.phone_number || null,
      email: body.email || null,
      company: body.company || null,
      source: body.source || 'manual',
      buying_intent: body.buying_intent || 'medium',
      city: body.city || null,
      state: body.state || null,
      estimated_budget: body.estimated_budget ? Number(body.estimated_budget) : null,
      deal_value: body.deal_value ? Number(body.deal_value) : null,
      status: body.status || 'new',
      sentiment_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(lead as any)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message, code: 'INSERT_FAILED' }, { status: 500 })

    // Audit log
    await logAudit({
      req, supabase,
      companyId: (uac as any)?.company_id || '',
      userId: user.id, userEmail: user.email || '',
      action: 'lead.created',
      entityType: 'lead', entityId: (data as any).id,
      newValue: data as object,
    })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
