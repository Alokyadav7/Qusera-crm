import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

/**
 * GET /api/test-email
 * ⚠️  DELETE THIS ROUTE after confirming email works
 * Visit: http://localhost:3000/api/test-email
 */
export async function GET() {
  const result = await sendEmail({
    to: process.env.GMAIL_USER ?? 'klinqcrm@gmail.com',
    subject: 'Klinq CRM — Email Test ✅',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;background:#f9f9fb;border-radius:16px;border:1px solid #e4e4e7;">
        <h2 style="color:#18181b;margin:0 0 12px;">Email is working! 🎉</h2>
        <p style="color:#52525b;margin:0 0 8px;">This test email was sent from <strong>Klinq CRM</strong> via Gmail SMTP.</p>
        <p style="color:#52525b;margin:0;">Sent at: <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong></p>
      </div>
    `,
  })

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${process.env.GMAIL_USER}`,
      messageId: result.messageId,
    })
  } else {
    return NextResponse.json({
      success: false,
      error: result.error,
      hint: 'Check GMAIL_USER and GMAIL_APP_PASSWORD in .env. App Password requires 2FA to be enabled on the Gmail account.',
    }, { status: 500 })
  }
}
