import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/api-key-auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.authorized || !auth.companyId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: deals, error } = await (supabase as any)
    .from('deals')
    .select('*')
    .eq('company_id', auth.companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: deals })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth.authorized || !auth.companyId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (!body.title) {
      return NextResponse.json({ error: 'Missing field: title' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: newDeal, error } = await (supabase as any)
      .from('deals')
      .insert({
        company_id: auth.companyId,
        title: body.title,
        value: body.value || 0,
        currency: body.currency || 'INR',
        stage: body.stage || 'prospect',
        close_date: body.close_date || null,
        contact_id: body.contact_id || null,
        probability: body.probability || 10,
        notes: body.notes || null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: newDeal }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

