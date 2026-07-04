import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'

// POST /api/interactions — Create an interaction with tenant context
export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json()
    const supabase = createServiceClient()

    const interaction = {
      user_id: ctx.userId,
      company_id: ctx.companyId,
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

    // Verify lead belongs to the same company if provided
    if (body.lead_id) {
      const { data: lead } = await (supabase as any)
        .from('leads')
        .select('id')
        .eq('id', body.lead_id)
        .eq('company_id', ctx.companyId)
        .maybeSingle()
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found in your company' }, { status: 404 })
      }
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
})

