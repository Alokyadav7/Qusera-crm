import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'

// POST /api/auth/reset-password
// Triggers a Supabase password reset email via the admin API.
// Security: ALWAYS returns 200 — never reveals whether email exists.
export async function POST(req: NextRequest) {
  let email: string

  try {
    const body = await req.json()
    email = body.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const svc = createServiceClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://klinqcrm.in'

    // Look up the user by email
    const { data: userList } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = userList?.users?.find(u => u.email?.toLowerCase() === email)

    if (user) {
      // Generate reset link via Supabase Admin API
      const { data: linkData, error: linkError } = await svc.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
        },
      })

      if (!linkError && linkData?.properties?.action_link) {
        // Send via Gmail SMTP (same transport as all other platform emails)
        await sendEmail({
          to: email,
          subject: 'Reset your Klinq CRM password',
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Klinq CRM password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="display:inline-block;width:10px;height:10px;background:#18181b;border-radius:50%;margin-right:8px;"></span>
          <span style="font-size:18px;font-weight:800;color:#18181b;letter-spacing:-0.5px;vertical-align:middle;">Klinq CRM</span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;padding:40px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px;">Password Reset</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#18181b;">Reset Your Password</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.7;">
            We received a request to reset the password for your Klinq CRM account.
            Click the button below to continue. This link expires in <strong>1 hour</strong>.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${linkData.properties.action_link}" style="display:inline-block;background:#18181b;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">
              Reset Password →
            </a>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#991b1b;">
              🔒 If you did not request this, your account is safe. Simply ignore this email — your password will not change.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            Need help? Contact <a href="mailto:klinqcrm@gmail.com" style="color:#71717a;">klinqcrm@gmail.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
      }
    }

    // ALWAYS return 200 — never reveal if email exists
    return NextResponse.json({
      message: 'If this email is registered, you will receive a reset link shortly.',
    })
  } catch (err) {
    console.error('[reset-password]', err)
    // Still return 200 — never reveal server errors to clients
    return NextResponse.json({
      message: 'If this email is registered, you will receive a reset link shortly.',
    })
  }
}

