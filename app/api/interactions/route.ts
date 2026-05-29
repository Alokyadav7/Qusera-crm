import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/interactions — Create an interaction with user_id + company_id stamped
export async function POST(req: NextRequest) {
  try {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const supabase = createServiceClient()

    const { data: uac } = await (supabase as any)
      .from('user_active_company')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    const interaction = {
      user_id: user.id,
      company_id: (uac as any)?.company_id || null,
      lead_id: body.lead_id || null,
      contact_id: body.contact_id || null,
      type: body.type || 'voice',
      direction: body.direction || 'inbound',
      content_raw: body.content_raw || null,
      content_transcribed: body.content_transcribed || null,
      sentiment_score: body.sentiment_score || 0,
      ai_summary: body.ai_summary || null,
      ai_extracted_data: body.ai_extracted_data || null,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await (supabase as any)
      .from('interactions')
      .insert(interaction)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
