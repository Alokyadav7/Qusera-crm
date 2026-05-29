import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { checkPermission } from '@/lib/permissions'

interface Ctx { params: Promise<{ id: string }> }

// DELETE /api/documents/[id]?company_id=xxx
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const company_id = searchParams.get('company_id') || ''

    const { allowed } = await checkPermission(user.id, company_id, 'documents.delete')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()

    // Get record to find storage path
    const { data: doc } = await (supabase as any).from('documents').select('storage_path, file_name, entity_type, entity_id')
      .eq('id', id).eq('company_id', company_id).single()
    if (!doc) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    // Delete from storage
    await supabase.storage.from('crm-documents').remove([(doc as any).storage_path])

    // Delete DB record
    const { error } = await (supabase as any).from('documents').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message, code: 'DELETE_FAILED' }, { status: 500 })

    await logAudit({ req, supabase, companyId: company_id, userId: user.id, userEmail: user.email || '',
      action: 'document.deleted', entityType: (doc as any).entity_type, entityId: (doc as any).entity_id,
      newValue: { file_name: (doc as any).file_name } })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
