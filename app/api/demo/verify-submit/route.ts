import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/demo/verify-submit
// Verifies OTP and saves the demo request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, company_name, team_size, intent, message, otp } = body

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Name, email and OTP are required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Find valid OTP
    const { data: otpRecord } = await (svc as any)
      .from('demo_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp.trim())
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please request a new code.' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await (svc as any)
      .from('demo_otps')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // Check for duplicate submission (same email in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: existingCount } = await (svc as any)
      .from('demo_requests')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', oneDayAgo)

    if ((existingCount ?? 0) > 0) {
      return NextResponse.json({
        success: true,
        message: 'Your request has already been received. Our team will contact you within 24 hours.',
        duplicate: true,
      })
    }

    // Insert demo request
    const { data: request, error: insertError } = await (svc as any)
      .from('demo_requests')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        company_name: company_name?.trim() || null,
        team_size: team_size || null,
        intent: intent || 'demo',
        message: message?.trim() || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Demo Submit] Insert error:', insertError.message)
      return NextResponse.json({ error: 'Failed to save request. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Thank you ${name}! We'll reach out to ${email} within 24 hours.`,
      id: request.id,
    })
  } catch (err: any) {
    console.error('[Demo Submit] Error:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
