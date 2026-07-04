import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/deals/[id] — Update lead/deal status (pipeline stage change)
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()
    const { stage, from_stage, company_id } = body

    if (!stage) return NextResponse.json({ error: 'stage is required', code: 'MISSING_FIELD' }, { status: 400 })

    const supabase = createServiceClient()

    // Validate company ownership — fetch current lead record
    const { data: existing, error: fetchErr } = await supabase
      .from('leads')
      .select('id, status, company_id, user_id')
      .eq('id', id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Deal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Verify caller belongs to the same company as the lead
    const { data: uac } = await (supabase as any)
      .from('user_active_company')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!uac || uac.company_id !== (existing as any).company_id) {
      return NextResponse.json({ error: 'Forbidden: deal belongs to another company', code: 'COMPANY_MISMATCH' }, { status: 403 })
    }

    const prevStage = from_stage || (existing as any).status

    // Update the lead stage
    const { data: updated, error: updateErr } = await supabase
      .from('leads')
      .update({
        status: stage,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message, code: 'UPDATE_FAILED' }, { status: 500 })
    }

    // Log deal stage activity
    if (prevStage !== stage) {
      await (supabase as any).from('deal_activities').insert({
        deal_id: id,
        company_id: (existing as any).company_id || null,
        user_id: user.id,
        type: 'stage_change',
        from_stage: prevStage,
        to_stage: stage,
        created_at: new Date().toISOString(),
      }).then(() => {}) // fire-and-forget, don't block response

      // Audit log
      await logAudit({
        req,
        supabase,
        companyId: (existing as any).company_id || '',
        userId: user.id,
        userEmail: user.email || '',
        action: 'deal.stage_changed',
        entityType: 'lead',
        entityId: id,
        oldValue: { status: prevStage },
        newValue: { status: stage },
      })
    }

    return NextResponse.json({ data: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// DELETE /api/deals/[id] — Delete a lead/deal
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const supabase = createServiceClient()
    const { data: existing } = await supabase.from('leads').select('*').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    // Verify caller belongs to the same company as the lead
    const { data: uac } = await (supabase as any)
      .from('user_active_company')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!uac || uac.company_id !== (existing as any).company_id) {
      return NextResponse.json({ error: 'Forbidden: lead belongs to another company', code: 'COMPANY_MISMATCH' }, { status: 403 })
    }

    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message, code: 'DELETE_FAILED' }, { status: 500 })

    await logAudit({
      req, supabase,
      companyId: (existing as any).company_id || '',
      userId: user.id, userEmail: user.email || '',
      action: 'lead.deleted',
      entityType: 'lead', entityId: id,
      oldValue: existing as object,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
