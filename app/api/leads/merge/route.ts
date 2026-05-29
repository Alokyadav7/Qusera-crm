import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { checkPermission } from '@/lib/permissions'

/**
 * POST /api/leads/merge
 * Body: { master_id, duplicate_id, company_id }
 * Moves all interactions/tasks/deals from duplicate → master, deletes duplicate.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { master_id, duplicate_id, company_id } = await req.json()
    if (!master_id || !duplicate_id || !company_id) {
      return NextResponse.json({ error: 'master_id, duplicate_id, company_id required', code: 'MISSING' }, { status: 400 })
    }
    if (master_id === duplicate_id) {
      return NextResponse.json({ error: 'Cannot merge a record with itself', code: 'INVALID' }, { status: 400 })
    }

    const { allowed } = await checkPermission(user.id, company_id, 'leads.edit')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()

    // Reassign all related records to master
    const tables = [
      { table: 'interactions', col: 'lead_id' },
      { table: 'deal_activities', col: 'lead_id' },
      { table: 'whatsapp_messages', col: 'lead_id' },
      { table: 'sms_messages', col: 'lead_id' },
      { table: 'emails', col: 'lead_id' },
      { table: 'tasks', col: 'lead_id' },
      { table: 'documents', col: 'entity_id' },
    ]

    for (const { table, col } of tables) {
      await (supabase as any)
        .from(table)
        .update({ [col]: master_id })
        .eq(col, duplicate_id)
        .catch(() => { /* table may not exist yet */ })
    }

    // Soft-delete duplicate
    const { error: delErr } = await (supabase as any)
      .from('leads')
      .update({ deleted_at: new Date().toISOString(), status: 'merged' })
      .eq('id', duplicate_id)
      .eq('company_id', company_id)

    if (delErr) return NextResponse.json({ error: delErr.message, code: 'DELETE_FAILED' }, { status: 500 })

    await logAudit({
      req, supabase, companyId: company_id,
      userId: user.id, userEmail: user.email || '',
      action: 'contact.merged',
      entityType: 'lead', entityId: master_id,
      newValue: { master_id, duplicate_id },
    })

    return NextResponse.json({ success: true, master_id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
