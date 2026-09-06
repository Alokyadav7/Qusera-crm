import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN ||
  process.env.META_WEBHOOK_VERIFY_TOKEN

function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

// GET — Meta verification challenge
export async function GET(request: NextRequest) {
  if (!VERIFY_TOKEN) {
    return NextResponse.json({ error: 'Webhook verification token not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const suppliedToken = searchParams.get('hub.verify_token') ?? ''
  if (searchParams.get('hub.mode') === 'subscribe' && secureCompare(suppliedToken, VERIFY_TOKEN)) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Receive lead data from Facebook/Instagram Lead Ads
// Webhook URL format: /api/webhooks/meta-leads?user_id=USER_ID&company_id=COMPANY_ID
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // ── Security: Verify Meta HMAC signature ─────────────────────
    const APP_SECRET = process.env.META_APP_SECRET || process.env.META_WHATSAPP_APP_SECRET
    if (!APP_SECRET) {
      console.error('[Meta Webhook] META_APP_SECRET not configured')
      return NextResponse.json({ error: 'Webhook signature secret not configured' }, { status: 503 })
    }

    const sig = request.headers.get('x-hub-signature-256') ?? ''
    const expected = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
    if (!secureCompare(sig, expected)) {
      console.error('[Meta Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { searchParams } = new URL(request.url)
    const companyIdParam = searchParams.get('company_id')
    const userIdParam = searchParams.get('user_id')

    const supabase = await createClient()

    for (const entry of body.entry || []) {
      const entryPageId = entry.id
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue

        const leadgenId = change.value.leadgen_id
        const formId = change.value.form_id
        const pageId = change.value.page_id || entryPageId

        // ── Map company using connected Page ID ─────────────────────
        let companyId = companyIdParam
        let userId = userIdParam
        let pageAccessToken = process.env.META_WHATSAPP_TOKEN || ''

        if (pageId) {
          const { data: intg } = await supabase
            .from('integrations')
            .select('user_id, meta_page_access_token')
            .eq('meta_page_id', String(pageId))
            .maybeSingle()

          if (intg?.user_id) {
            userId = intg.user_id
            if (intg.meta_page_access_token) {
              pageAccessToken = intg.meta_page_access_token
            }
            const { data: profile } = await supabase
              .from('profiles')
              .select('company_id')
              .eq('id', intg.user_id)
              .maybeSingle()
            if (profile?.company_id) {
              companyId = profile.company_id
            }
          }
        }

        // Fallback to active company if we only have userId
        if (!companyId && userId) {
          const { data: uac } = await (supabase as any)
            .from('user_active_company')
            .select('company_id')
            .eq('user_id', userId)
            .maybeSingle()
          if (uac?.company_id) {
            companyId = uac.company_id
          }
        }

        if (!companyId) {
          console.warn(`[Meta Webhook] Skipping lead — could not resolve company_id for page: ${pageId}`)
          continue
        }

        // Fetch full lead data from Meta Graph API
        let leadData: any = { field_data: [], ad_name: 'Unknown Ad' }
        if (leadgenId && String(leadgenId).startsWith('test-')) {
          leadData = {
            ad_name: 'Meta Ads Test Ad',
            field_data: [
              { name: 'full_name', values: ['Jane Doe Meta Test'] },
              { name: 'email', values: ['janedoe.meta@test.com'] },
              { name: 'phone_number', values: ['+918888888888'] },
              { name: 'company_name', values: ['Meta Ads Test Corp'] },
              { name: 'city', values: ['Bangalore'] }
            ]
          }
        } else if (pageAccessToken && !pageAccessToken.includes('replace')) {
          const res = await fetch(
            `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${pageAccessToken}`
          )
          leadData = await res.json()
        }

        const fields: Record<string, string> = {}
        for (const f of leadData.field_data || []) fields[f.name] = f.values?.[0] || ''

        const fullName =
          (`${fields.first_name || ''} ${fields.last_name || ''}`).trim() ||
          fields.full_name || fields.name || 'Meta Lead'

        const { data: newLead, error } = await (supabase as any).from('leads').insert({
          user_id: userId || null,
          company_id: companyId,
          full_name: fullName,
          email: fields.email || null,
          phone: fields.phone_number || fields.mobile || fields.phone || null,
          company: fields.company_name || null,
          city: fields.city || null,
          state: fields.state || null,
          source: 'Meta Ads',
          status: 'new',
          buying_intent: 'high',
          sentiment_score: 0,
          gst_status: 'pending',
          pan_status: 'pending',
          meta_lead_id: leadgenId,
          meta_form_id: formId,
          meta_ad_name: leadData.ad_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().single()

        if (error) {
          console.error('[Meta Webhook] Error saving lead:', error.message)
          continue
        }

        if (newLead) {
          let notifyUserId = userId
          if (!notifyUserId) {
            const { data: companyDetails } = await (supabase as any)
              .from('companies')
              .select('owner_id')
              .eq('id', companyId)
              .single()
            notifyUserId = companyDetails?.owner_id || null
          }

          if (notifyUserId) {
            await (supabase as any).from('notifications').insert({
              user_id: notifyUserId,
              company_id: companyId,
              title: `New Meta Ads Lead: ${fullName}`,
              body: `Ad: ${leadData.ad_name || 'Unknown'} · ${fields.email || fields.phone_number || fields.mobile || ''}`,
              entity_type: 'lead',
              entity_id: newLead.id,
              read: false,
              created_at: new Date().toISOString(),
            })
          }
          console.log(`[Meta Webhook] Lead saved: ${fullName} → company ${companyId}`)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Meta Webhook] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
