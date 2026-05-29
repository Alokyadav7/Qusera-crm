import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { checkPermission } from '@/lib/permissions'

// GET /api/products?company_id=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const company_id = searchParams.get('company_id')
    const active_only = searchParams.get('active') !== 'false'
    if (!company_id) return NextResponse.json({ error: 'company_id required', code: 'MISSING' }, { status: 400 })

    const supabase = createServiceClient()
    let query = (supabase as any).from('products').select('*').eq('company_id', company_id)
    if (active_only) query = query.eq('is_active', true)
    const { data, error } = await query.order('name')
    if (error) return NextResponse.json({ error: error.message, code: 'FETCH_FAILED' }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// POST /api/products — Create product
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json()
    const { company_id, name, description, unit_price, currency, category, sku } = body
    if (!company_id || !name) return NextResponse.json({ error: 'company_id, name required', code: 'MISSING' }, { status: 400 })

    const { allowed } = await checkPermission(user.id, company_id, 'settings.manage')
    if (!allowed) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

    const supabase = createServiceClient()
    const { data, error } = await (supabase as any).from('products').insert({
      company_id, name, description: description || null,
      unit_price: Number(unit_price) || 0,
      currency: currency || 'INR',
      category: category || null,
      sku: sku || null,
      is_active: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message, code: 'INSERT_FAILED' }, { status: 500 })

    await logAudit({ req, supabase, companyId: company_id, userId: user.id, userEmail: user.email || '',
      action: 'product.created', entityType: 'product', entityId: (data as any).id, newValue: data as object })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
