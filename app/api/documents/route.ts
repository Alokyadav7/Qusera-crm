import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { checkPermission } from '@/lib/permissions'

// GET /api/documents?entity_type=lead&entity_id=xxx&company_id=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    const company_id = searchParams.get('company_id')
    if (!entity_id || !company_id) return NextResponse.json({ error: 'entity_id, company_id required', code: 'MISSING' }, { status: 400 })

    const supabase = createServiceClient()
    let query = (supabase as any).from('documents').select('*').eq('company_id', company_id).eq('entity_id', entity_id)
    if (entity_type) query = query.eq('entity_type', entity_type)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message, code: 'FETCH_FAILED' }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// POST /api/documents — Upload a file to Supabase Storage
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const entity_type = formData.get('entity_type')?.toString() || ''
    const entity_id = formData.get('entity_id')?.toString() || ''
    const company_id = formData.get('company_id')?.toString() || ''

    if (!file || !entity_id || !company_id) {
      return NextResponse.json({ error: 'file, entity_id, company_id required', code: 'MISSING' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)', code: 'FILE_TOO_LARGE' }, { status: 413 })
    }

    const ALLOWED = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png','image/jpeg','image/webp']
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed', code: 'INVALID_TYPE' }, { status: 415 })
    }

    const { allowed } = await checkPermission(user.id, company_id, 'documents.upload')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()
    const ext = file.name.split('.').pop()
    const storagePath = `${company_id}/${entity_type}/${entity_id}/${Date.now()}-${file.name}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await supabase.storage
      .from('crm-documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message, code: 'UPLOAD_FAILED' }, { status: 500 })

    // Get public URL
    const { data: urlData } = supabase.storage.from('crm-documents').getPublicUrl(storagePath)

    // Save record to DB
    const { data, error: dbErr } = await (supabase as any).from('documents').insert({
      company_id,
      entity_type,
      entity_id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      uploaded_by: user.id,
      created_at: new Date().toISOString(),
    }).select().single()

    if (dbErr) return NextResponse.json({ error: dbErr.message, code: 'DB_FAILED' }, { status: 500 })

    await logAudit({ req, supabase, companyId: company_id, userId: user.id, userEmail: user.email || '',
      action: 'document.uploaded', entityType: entity_type, entityId: entity_id,
      newValue: { file_name: file.name, file_size: file.size, storage_path: storagePath } })

    return NextResponse.json({ data: { ...(data as object), public_url: urlData.publicUrl } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
