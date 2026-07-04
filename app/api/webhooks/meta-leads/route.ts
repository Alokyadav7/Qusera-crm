import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── FIX B2: Read WHATSAPP_VERIFY_TOKEN (what's set in .env), with fallback to
// META_WEBHOOK_VERIFY_TOKEN for forward compatibility.
const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN ||
  process.env.META_WEBHOOK_VERIFY_TOKEN ||
  'KlinqCRM_webhook_verify_2024'

// GET — Meta verification challenge
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('hub.mode') === 'subscribe' && searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Receive lead data from Facebook/Instagram Lead Ads
// Webhook URL format: /api/webhooks/meta-leads?user_id=USER_ID&secret=WEBHOOK_SECRET
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const body = await request.json()
    const supabase = await createClient()

    // Look up this company's Meta token from their integrations row
    let pageAccessToken = process.env.META_WHATSAPP_TOKEN || ''
    let companyId: string | null = null

    if (userId) {
      const { data: intg } = await supabase
        .from('integrations')
        .select('meta_page_access_token')
        .eq('user_id', userId)
        .single()
      if (intg?.meta_page_access_token) pageAccessToken = intg.meta_page_access_token

      // ── FIX W4: Resolve company_id from user_active_company so leads are
      // scoped to the company and visible to ALL team members, not just the user.
      const { data: uac } = await (supabase as any)
        .from('user_active_company')
        .select('company_id')
        .eq('user_id', userId)
        .single()
      companyId = uac?.company_id ?? null
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue

        const leadgenId = change.value.leadgen_id
        const formId = change.value.form_id

        // Fetch full lead data from Meta Graph API
        let leadData: any = { field_data: [], ad_name: 'Unknown Ad' }
        if (pageAccessToken && !pageAccessToken.includes('replace')) {
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
        const platform = entry.platform === 'instagram' ? 'instagram_ads' : 'facebook_ads'

        // Guard: skip if we can't resolve company_id — without it the lead is invisible to the team
        if (!companyId) {
          console.warn(`[Meta Webhook] Skipping lead "${fullName}" — could not resolve company_id for user ${userId}`)
          continue
        }

        const { data: newLead, error } = await (supabase as any).from('leads').insert({
          user_id: userId || null,
          company_id: companyId,            // ← required: makes lead visible to all company members
          full_name: fullName,
          email: fields.email || null,
          phone: fields.phone_number || fields.mobile || null,
          company: fields.company_name || null,
          city: fields.city || null,
          state: fields.state || null,
          source: platform,
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

        if (!error && newLead && userId) {
          await (supabase as any).from('notifications').insert({
            user_id: userId,
            company_id: companyId,
            type: 'lead',
            priority: 'high',
            title: `New ${platform === 'instagram_ads' ? 'Instagram 📸' : 'Facebook 📘'} lead: ${fullName}`,
            body: `Ad: ${leadData.ad_name || 'Unknown'} · ${fields.email || fields.phone_number || ''}`,
            is_read: false,
            action_href: '/dashboard/leads',
            action_label: 'View Lead',
            created_at: new Date().toISOString(),
          })
        }
        if (error) console.error('[Meta Webhook] Error:', error.message)
        else console.log(`[Meta Webhook] Lead saved: ${fullName} → user ${userId} → company ${companyId}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Meta Webhook] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
