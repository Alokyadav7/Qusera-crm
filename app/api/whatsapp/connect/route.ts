import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/whatsapp/connect
 * Called after company completes Meta Embedded Signup.
 * Exchanges auth code → access token → fetches WABA + phone details → stores in DB.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { code, company_id } = await req.json()
    if (!code || !company_id) {
      return NextResponse.json(
        { error: 'Missing code or company_id', code: 'BAD_REQUEST' },
        { status: 400 }
      )
    }

    // Verify caller belongs to this company
    const svc = createServiceClient()
    const { data: member } = await (svc as any)
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .single()

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Admin access required', code: 'FORBIDDEN' }, { status: 403 })
    }

    const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID
    const APP_SECRET = process.env.META_APP_SECRET
    const SYSTEM_TOKEN = process.env.META_SYSTEM_USER_TOKEN

    if (!APP_ID || !APP_SECRET || !SYSTEM_TOKEN) {
      return NextResponse.json(
        { error: 'WhatsApp integration not configured on server. Contact platform admin.', code: 'NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // ── Step 1: Exchange code for short-lived user access token ──────────────
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${encodeURIComponent(code)}`
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Meta token exchange failed:', tokenData)
      return NextResponse.json(
        { error: 'Failed to exchange code with Meta. Please try again.', code: 'TOKEN_EXCHANGE_FAILED' },
        { status: 502 }
      )
    }
    const shortToken: string = tokenData.access_token

    // ── Step 2: Exchange for long-lived token (60-day expiry) ────────────────
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`
    )
    const longTokenData = await longTokenRes.json()
    const accessToken: string = longTokenData.access_token ?? shortToken
    const tokenExpiresAt = longTokenData.expires_in
      ? new Date(Date.now() + longTokenData.expires_in * 1000).toISOString()
      : null

    // ── Step 3: Inspect token to get WABA ID ─────────────────────────────────
    const debugRes = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?` +
      `input_token=${accessToken}&access_token=${SYSTEM_TOKEN}`
    )
    const debugData = await debugRes.json()
    const granularScopes: any[] = debugData?.data?.granular_scopes ?? []
    const wabaScope = granularScopes.find(
      (s: any) => s.scope === 'whatsapp_business_management'
    )
    const wabaId: string | undefined = wabaScope?.target_ids?.[0]

    if (!wabaId) {
      return NextResponse.json(
        { error: 'Could not determine WhatsApp Business Account ID. Ensure you granted the correct permissions.', code: 'NO_WABA' },
        { status: 400 }
      )
    }

    // ── Step 4: Get phone numbers for this WABA ───────────────────────────────
    const phoneRes = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?` +
      `fields=id,display_phone_number,verified_name,quality_rating&` +
      `access_token=${SYSTEM_TOKEN}`
    )
    const phoneData = await phoneRes.json()
    const phones: any[] = phoneData?.data ?? []

    if (!phones.length) {
      return NextResponse.json(
        { error: 'No phone numbers found in this WhatsApp Business Account.', code: 'NO_PHONE' },
        { status: 400 }
      )
    }

    const phone = phones[0]
    const phoneNumberId: string = phone.id
    const phoneNumber: string = phone.display_phone_number
    const displayName: string = phone.verified_name ?? ''
    const qualityRating: string = phone.quality_rating ?? 'GREEN'

    // ── Step 5: Subscribe webhook for this WABA ───────────────────────────────
    await fetch(`https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SYSTEM_TOKEN}` },
    })

    // ── Step 6: Upsert into company_whatsapp ──────────────────────────────────
    const { error: upsertErr } = await (svc as any).from('company_whatsapp').upsert(
      {
        company_id,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: phoneNumber,
        display_name: displayName,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        quality_rating: qualityRating,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' }
    )

    if (upsertErr) {
      console.error('DB upsert error:', upsertErr)
      return NextResponse.json(
        { error: 'Failed to save WhatsApp configuration.', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    // ── Step 7: Audit log ─────────────────────────────────────────────────────
    await (svc as any).from('audit_logs').insert({
      company_id,
      user_id: user.id,
      action: 'whatsapp.connected',
      resource: 'company_whatsapp',
      details: { phone_number: phoneNumber, waba_id: wabaId, display_name: displayName },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      phone_number: phoneNumber,
      display_name: displayName,
      waba_id: wabaId,
    })
  } catch (err: any) {
    console.error('WhatsApp connect error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Unexpected error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
