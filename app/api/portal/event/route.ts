import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/portal/event — Log portal event (no auth required — public portal)
export async function POST(req: NextRequest) {
  try {
    const { token_id, event_type, signature, comment } = await req.json()
    if (!token_id || !event_type) return NextResponse.json({ error: 'token_id, event_type required', code: 'MISSING' }, { status: 400 })

    const supabase = createServiceClient()

    // Validate token exists and is not expired
    const { data: token } = await (supabase as any)
      .from('deal_portal_tokens')
      .select('id, deal_id, company_id')
      .eq('id', token_id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!token) return NextResponse.json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, { status: 404 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null

    await (supabase as any).from('deal_portal_events').insert({
      token_id,
      event_type,
      signature: signature || null,
      comment: comment || null,
      client_ip: ip,
      created_at: new Date().toISOString(),
    })

    // If accepted, update deal status
    if (event_type === 'accepted') {
      await (supabase as any).from('deals')
        .update({ stage: 'client_accepted', last_activity_at: new Date().toISOString() })
        .eq('id', (token as any).deal_id)

      // Notify the rep
      await (supabase as any).from('notifications').insert({
        company_id: (token as any).company_id,
        user_id: null, // broadcast to company
        title: '🎉 Deal accepted by client!',
        body: `Client signed the proposal${signature ? `: ${signature}` : ''}`,
        entity_type: 'deal',
        entity_id: (token as any).deal_id,
        read: false,
        created_at: new Date().toISOString(),
      })
    }

    if (event_type === 'commented') {
      await (supabase as any).from('notifications').insert({
        company_id: (token as any).company_id,
        user_id: null,
        title: 'Client left a comment on deal',
        body: comment?.substring(0, 100) || '',
        entity_type: 'deal',
        entity_id: (token as any).deal_id,
        read: false,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
