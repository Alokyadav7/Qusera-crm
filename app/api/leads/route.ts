import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { logAudit } from '@/lib/audit'

// POST /api/leads — Create a lead with company_id from tenant context
export const POST = withTenantAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json()
    const supabase = createServiceClient()

    // Required field validation
    if (!body.full_name?.trim()) {
      return NextResponse.json({ error: 'full_name is required', code: 'MISSING_FIELD' }, { status: 400 })
    }

    // If assigned_to is provided, verify they belong to the same company
    if (body.assigned_to) {
      const { data: assignee } = await (supabase as any)
        .from('company_members')
        .select('user_id')
        .eq('company_id', ctx.companyId)
        .eq('user_id', body.assigned_to)
        .eq('is_active', true)
        .maybeSingle()

      if (!assignee) {
        return NextResponse.json({
          error: 'assigned_to user is not a member of this company',
          code: 'INVALID_ASSIGNEE',
        }, { status: 400 })
      }
    }

    const lead = {
      user_id: ctx.userId,
      company_id: ctx.companyId,
      full_name: body.full_name.trim(),
      phone: body.phone || body.phone_number || null,
      email: body.email || null,
      company: body.company || null,
      source: body.source || 'manual',
      buying_intent: body.buying_intent || 'medium',
      city: body.city || null,
      state: body.state || null,
      estimated_budget: body.estimated_budget ? Number(body.estimated_budget) : null,
      deal_value: body.deal_value ? Number(body.deal_value) : null,
      status: body.status || 'new',
      assigned_to: body.assigned_to || null,
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
      companyId: ctx.companyId,
      userId: ctx.userId, userEmail: ctx.userEmail || '',
      action: 'lead.created',
      entityType: 'lead', entityId: (data as any).id,
      newValue: data as object,
    })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}, { requiredRoles: ['owner', 'admin', 'manager', 'sales'] })

