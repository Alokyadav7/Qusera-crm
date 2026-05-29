import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit } from '@/lib/audit'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/leads/deduplicate
 * Body: { email?, phone?, company_id }
 * Returns: { duplicates: Lead[] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { email, phone, company_id } = await req.json()
    if (!company_id) return NextResponse.json({ error: 'company_id required', code: 'MISSING' }, { status: 400 })

    const supabase = createServiceClient()
    const conditions: string[] = []
    const params: Record<string, string> = { company_id }

    const orParts: string[] = []
    if (email) orParts.push(`email.ilike.${email}`)
    if (phone) {
      const clean = phone.replace(/\D/g, '').slice(-10)
      orParts.push(`phone_number.ilike.%${clean}%`)
    }

    if (!orParts.length) return NextResponse.json({ duplicates: [] })

    let query = (supabase as any)
      .from('leads')
      .select('id, full_name, email, phone_number, status, created_at')
      .eq('company_id', company_id)

    if (orParts.length === 1) {
      if (email) query = query.ilike('email', email)
      else {
        const clean = phone!.replace(/\D/g, '').slice(-10)
        query = query.ilike('phone_number', `%${clean}%`)
      }
    } else {
      query = query.or(orParts.join(','))
    }

    const { data, error } = await query.limit(10)
    if (error) return NextResponse.json({ error: error.message, code: 'QUERY_FAILED' }, { status: 500 })
    return NextResponse.json({ duplicates: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
