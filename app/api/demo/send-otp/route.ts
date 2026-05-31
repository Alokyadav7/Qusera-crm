import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function otpEmailHtml(opts: { otp: string; name?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:20px;text-align:center;">
          <img src="https://klinqcrm.in/Klinqcrm-logo.png" alt="Klinq CRM" style="height:48px;width:auto;"/>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <div style="height:4px;background:linear-gradient(90deg,#18181b,#52525b);"></div>
          <div style="padding:36px 40px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:1px;">Email Verification</p>
            <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#18181b;">
              ${opts.name ? `Hi ${opts.name},` : 'Verify your email'}
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.7;">
              Use the code below to verify your email and complete your KlinqCRM demo request. This code is valid for <strong>10 minutes</strong>.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <div style="display:inline-block;background:#18181b;color:#ffffff;font-size:38px;font-weight:900;letter-spacing:14px;padding:20px 36px;border-radius:12px;font-family:monospace;">
                ${opts.otp}
              </div>
              <p style="margin:10px 0 0;font-size:12px;color:#a1a1aa;">Valid for 10 minutes only. Do not share this code.</p>
            </div>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;">
              <p style="margin:0;font-size:13px;color:#991b1b;">🔒 If you did not request this, simply ignore this email.</p>
            </div>
          </div>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;">Powered by Klinq CRM Platform · klinqcrm.in</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// POST /api/demo/send-otp
export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Rate-limit: max 3 OTPs per email in last 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await (svc as any)
      .from('demo_otps')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', tenMinsAgo)

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait 10 minutes before trying again.' },
        { status: 429 }
      )
    }

    // Invalidate old OTPs for this email
    await (svc as any)
      .from('demo_otps')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false)

    // Generate & store new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await (svc as any).from('demo_otps').insert({
      email,
      otp,
      expires_at: expiresAt,
      used: false,
    })

    // Send email
    const result = await sendEmail({
      to: email,
      subject: 'Your KlinqCRM Verification Code',
      html: otpEmailHtml({ otp, name }),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: `OTP sent to ${email}` })
  } catch (err: any) {
    console.error('[Demo OTP] Error:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
