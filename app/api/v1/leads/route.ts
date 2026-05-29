import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.authorized || !auth.companyId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: leads, error } = await (supabase as any)
    .from('leads')
    .select('*')
    .eq('company_id', auth.companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: leads })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.authorized || !auth.companyId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (!body.full_name) {
      return NextResponse.json({ error: 'Missing field: full_name' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: newLead, error } = await (supabase as any)
      .from('leads')
      .insert({
        company_id: auth.companyId,
        full_name: body.full_name,
        email: body.email || null,
        phone_number: body.phone_number || null,
        company: body.company || null,
        source: body.source || 'api',
        buying_intent: body.buying_intent || 'medium',
        deal_value: body.deal_value || 0
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: newLead }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

