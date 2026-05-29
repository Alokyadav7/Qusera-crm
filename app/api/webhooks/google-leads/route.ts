import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Google Lead Gen Form Webhook ──────────────────────────────────────────────
// Setup:
// 1. Go to Google Ads → Campaign → Ad Extensions → Lead Form Extension
// 2. Under "Lead delivery", set Webhook URL: https://yourdomain.com/api/webhooks/google-leads
// 3. Set Key: same as GOOGLE_LEADS_WEBHOOK_KEY in .env
// 4. Google sends a JSON POST for every new lead form submission

const WEBHOOK_KEY = process.env.GOOGLE_LEADS_WEBHOOK_KEY || 'KlinqCRM_google_key'

export async function GET() {
  // Google verifies the endpoint by sending a GET — just return 200
  return NextResponse.json({ status: 'KlinqCRM Google Lead Webhook Active' })
}

export async function POST(request: NextRequest) {
  try {
    // Google sends the key as a query param or header
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key') || request.headers.get('x-goog-signature')

    // Optional: verify key in production
    // if (key !== WEBHOOK_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    console.log('[Google Lead Webhook] Received:', JSON.stringify(body))

    // Google Lead Gen payload structure:
    // { google_key, lead_id, user_column_data: [{column_name, string_value}], campaign_id, adgroup_id, ... }
    const leadId = body.lead_id || body.id
    const columnData: { column_name: string; string_value: string }[] = body.user_column_data || []

    const fields: Record<string, string> = {}
    for (const col of columnData) {
      fields[col.column_name.toLowerCase().replace(/\s+/g, '_')] = col.string_value || ''
    }

    const fullName = fields.full_name || fields.name ||
      (`${fields.first_name || ''} ${fields.last_name || ''}`).trim() || 'Google Lead'

    const supabase = await createClient()

    const { data: newLead, error } = await (supabase as any).from('leads').insert({
      user_id: null,
      full_name: fullName,
      email: fields.email || null,
      phone_number: fields.phone_number || fields.phone || null,
      company: fields.company || fields.company_name || null,
      city: fields.city || null,
      source: 'google_ads',
      status: 'new',
      buying_intent: 'high',
      sentiment_score: 0,
      gst_status: 'pending',
      pan_status: 'pending',
      google_lead_id: leadId,
      google_campaign_id: body.campaign_id ? String(body.campaign_id) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single()

    if (!error && newLead) {
      await (supabase as any).from('notifications').insert({
        user_id: null,
        type: 'lead',
        priority: 'high',
        title: `New Google Ads lead: ${fullName}`,
        body: `${fields.email || fields.phone_number || ''} · Campaign: ${body.campaign_name || body.campaign_id || 'Unknown'}`,
        is_read: false,
        action_href: '/dashboard/leads',
        action_label: 'View Lead',
        created_at: new Date().toISOString(),
      })
      console.log(`[Google Lead Webhook] Lead saved: ${fullName}`)
    } else if (error) {
      console.error('[Google Lead Webhook] Error:', error.message)
    }

    // Google expects a 200 response quickly
    return NextResponse.json({ status: 'received', lead_id: leadId })
  } catch (err: any) {
    console.error('[Google Lead Webhook] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
