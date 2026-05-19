import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Fast2SMS Bulk SMS API (India) ──────────────────────────────────────────────
// Get free key at: https://www.fast2sms.com/dashboard/credentials
// Supports 160 chars free DLT SMS

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, numbers, leadIds, templateId } = body as {
      message: string
      numbers: string[]       // phone numbers
      leadIds?: string[]      // optional — to log interaction per lead
      templateId?: string     // DLT template ID (required for India)
    }

    if (!message || !numbers?.length) {
      return NextResponse.json({ error: 'message and numbers are required' }, { status: 400 })
    }

    const API_KEY = process.env.FAST2SMS_API_KEY
    const SENDER_ID = process.env.FAST2SMS_SENDER_ID || 'ORBITC'

    // Clean numbers — strip spaces, +91, etc.
    const cleaned = numbers.map(n => n.replace(/\D/g, '').slice(-10)).filter(n => n.length === 10)

    let provider = 'mock'
    let sendResult: any = { sent: cleaned.length, failed: 0 }

    if (API_KEY && !API_KEY.includes('replace')) {
      // Real Fast2SMS send
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'dlt',                        // DLT route for India
          sender_id: SENDER_ID,
          message,
          template_id: templateId || '',
          variables_values: '',
          flash: 0,
          numbers: cleaned.join(','),
        }),
      })
      const data = await res.json()
      provider = 'fast2sms'
      if (!data.return) {
        sendResult = { sent: 0, failed: cleaned.length, error: data.message }
      } else {
        sendResult = { sent: cleaned.length, failed: 0, requestId: data.request_id }
      }
    }

    // Log interaction for each lead in Supabase
    if (leadIds?.length) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const rows = leadIds.map(lid => ({
          user_id: user.id,
          lead_id: lid,
          type: 'sms',
          direction: 'outbound',
          content_raw: message,
          created_at: new Date().toISOString(),
        }))
        await supabase.from('interactions').insert(rows)
      }
    }

    return NextResponse.json({
      success: true,
      provider,
      mock: provider === 'mock',
      message: provider === 'mock'
        ? 'SMS sent (mock — add FAST2SMS_API_KEY to .env to send real SMS)'
        : `SMS sent to ${sendResult.sent} numbers`,
      ...sendResult,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
