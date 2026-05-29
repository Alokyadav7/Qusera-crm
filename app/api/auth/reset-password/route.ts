import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

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

    // Look up the user by email
    const { data: userList } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = userList?.users?.find(u => u.email?.toLowerCase() === email)

    if (user) {
      // User exists — generate reset link via Supabase Admin API
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      const { data: linkData, error: linkError } = await svc.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
        },
      })

      if (!linkError && linkData?.properties?.action_link) {
        // Send via Resend
        const resendKey = process.env.RESEND_API_KEY
        const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'noreply@klinq.app'

        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `Klinq CRM <${fromEmail}>`,
              to: [email],
              subject: 'Reset your Klinq CRM password',
              html: `
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
                  <div style="margin-bottom:32px">
                    <div style="width:40px;height:40px;background:#09090b;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:16px">
                      <span style="color:#fff;font-weight:900;font-size:18px">K</span>
                    </div>
                    <h1 style="font-size:22px;font-weight:700;color:#09090b;margin:0 0 8px">Reset your password</h1>
                    <p style="color:#71717a;font-size:14px;margin:0">We received a request to reset the password for your Klinq CRM account.</p>
                  </div>
                  
                  <a href="${linkData.properties.action_link}" 
                     style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px">
                    Reset Password →
                  </a>

                  <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin-bottom:24px">
                    <p style="color:#52525b;font-size:12px;margin:0 0 4px;font-weight:600">Security Notice</p>
                    <p style="color:#71717a;font-size:12px;margin:0;line-height:1.6">
                      This link expires in <strong>1 hour</strong>. If you did not request this reset, 
                      you can safely ignore this email — your password will not change.
                    </p>
                  </div>
                  
                  <p style="color:#a1a1aa;font-size:11px;border-top:1px solid #f4f4f5;padding-top:20px;margin:0">
                    Sent by Klinq CRM · If you need help, contact your administrator.
                  </p>
                </div>
              `,
            }),
          }).catch(console.error)
        }
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
