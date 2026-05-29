import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { formId, data } = body

    if (!formId || !data) {
      return NextResponse.json({ error: 'formId and data are required' }, { status: 400 })
    }

    const svc = createServiceClient()

    // 1. Fetch form config
    const { data: form, error: formErr } = await (svc as any)
      .from('lead_forms')
      .select('*')
      .eq('id', formId)
      .single()

    if (formErr || !form) {
      return NextResponse.json({ error: 'Lead form not found or unpublished' }, { status: 404 })
    }

    // 2. Validate required fields matching form.fields
    const formFields = form.fields as Array<{ key: string; label: string; required: boolean }>
    for (const f of formFields) {
      if (f.required && !data[f.key]) {
        return NextResponse.json({ error: `Field "${f.label}" is required` }, { status: 400 })
      }
    }

    // 3. Create lead in Supabase under company context
    const { data: lead, error: leadErr } = await (svc as any)
      .from('leads')
      .insert({
        company_id: form.company_id,
        full_name: data.full_name || data.name || 'Anonymous Form Lead',
        email: data.email || null,
        phone_number: data.phone || data.phone_number || null,
        company: data.company || null,
        source: 'web_form',
        status: 'new',
        buying_intent: 'medium',
        sentiment_score: 50,
      })
      .select()
      .single()

    if (leadErr || !lead) {
      console.error('[Form Submit] Lead creation error:', leadErr?.message)
      return NextResponse.json({ error: 'Failed to record entry: ' + (leadErr?.message ?? 'Unknown') }, { status: 500 })
    }

    // 4. Save form submission record
    await (svc as any)
      .from('lead_form_submissions')
      .insert({
        form_id: form.id,
        company_id: form.company_id,
        lead_id: lead.id,
        data,
        ip_address: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent') || null,
      })

    // 5. Increment form submission count
    await (svc as any)
      .from('lead_forms')
      .update({ submit_count: (form.submit_count ?? 0) + 1 })
      .eq('id', form.id)

    // Check if the company has an active onboarding sequence or welcome automated nurture to enroll in
    const { data: activeSeq } = await (svc as any)
      .from('email_sequences')
      .select('id')
      .eq('company_id', form.company_id)
      .eq('trigger_type', 'lead_created')
      .eq('is_active', true)
      .maybeSingle()

    if (activeSeq) {
      // Auto-enroll new lead in the campaign
      const nextSendDate = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // schedule 1st step in 1 hour
      await (svc as any)
        .from('email_sequence_enrollments')
        .insert({
          sequence_id: activeSeq.id,
          company_id: form.company_id,
          lead_id: lead.id,
          current_step: 1,
          next_send_at: nextSendDate,
          status: 'active',
        })
        .catch((err: any) => console.error('[Form Submit] Automation enrollment failed:', err?.message))
    }

    return NextResponse.json({ success: true, leadId: lead.id })
  } catch (err: any) {
    console.error('[Form Submit] Internal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
