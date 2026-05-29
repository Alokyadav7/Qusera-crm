import nodemailer from 'nodemailer'

// ─── Transporter ──────────────────────────────────────────────────────────────
// Gmail SMTP via App Password — works with klinqcrm@gmail.com
// Requires: GMAIL_USER + GMAIL_APP_PASSWORD in .env
// Get App Password: myaccount.google.com → Security → 2-Step Verification → App Passwords

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Sends an email via Gmail SMTP using the app password.
 * FROM: Klinq CRM <klinqcrm@gmail.com>
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Klinq CRM'
  const fromAddr = process.env.GMAIL_USER ?? 'klinqcrm@gmail.com'

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo ?? fromAddr,
    })
    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error('[Email] Send failed:', err?.message)
    return { success: false, error: err?.message ?? 'Unknown email error' }
  }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

function baseWrapper(content: string, footerLine?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Klinq CRM</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:10px;height:10px;background:#18181b;border-radius:50%;"></span>
                <span style="font-size:18px;font-weight:800;color:#18181b;letter-spacing:-0.5px;">Klinq CRM</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                ${footerLine ?? 'Need help? Reply to this email or contact <a href="mailto:klinqcrm@gmail.com" style="color:#71717a;">klinqcrm@gmail.com</a>'}
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#d4d4d8;">
                Powered by Klinq CRM Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Template 1: Company Onboarding ──────────────────────────────────────────

export function onboardingEmailHtml(opts: {
  adminName: string
  companyName: string
  adminEmail: string
  tempPassword: string
  loginUrl: string
}): string {
  return baseWrapper(`
    <!-- Top accent bar -->
    <tr><td style="height:4px;background:linear-gradient(90deg,#18181b,#52525b);"></td></tr>

    <div style="padding:40px 40px 32px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px;">
        Account Ready
      </p>
      <h1 style="margin:0 0 24px;font-size:28px;font-weight:800;color:#18181b;line-height:1.2;">
        Welcome to Klinq CRM, ${opts.adminName}!
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.7;">
        Your company <strong style="color:#18181b;">${opts.companyName}</strong> has been onboarded successfully.
        You can now log in and set up your team, configure integrations, and start managing your leads.
      </p>

      <!-- Credentials box -->
      <div style="background:#f9f9fb;border:1px solid #e4e4e7;border-radius:12px;padding:24px;margin-bottom:24px;">
        <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#18181b;text-transform:uppercase;letter-spacing:0.5px;">
          Your Login Credentials
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#71717a;width:140px;">Login URL</td>
            <td style="padding:8px 0;font-size:13px;">
              <a href="${opts.loginUrl}" style="color:#2563eb;font-weight:500;">${opts.loginUrl}</a>
            </td>
          </tr>
          <tr><td colspan="2"><div style="height:1px;background:#e4e4e7;"></div></td></tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#71717a;">Email</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#18181b;">${opts.adminEmail}</td>
          </tr>
          <tr><td colspan="2"><div style="height:1px;background:#e4e4e7;"></div></td></tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#71717a;">Temp Password</td>
            <td style="padding:8px 0;">
              <code style="background:#fef3c7;border:1px solid #fde68a;color:#92400e;padding:4px 12px;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:1px;">${opts.tempPassword}</code>
            </td>
          </tr>
        </table>
      </div>

      <!-- Warning -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          ⚠️ This password expires in <strong>7 days</strong>. You will be prompted to change it on first login.
        </p>
      </div>

      <!-- Steps -->
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#18181b;">Get started in 3 steps:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        ${['Log in and change your password', 'Complete your company profile', 'Invite your team members'].map((step, i) => `
        <tr>
          <td style="padding:6px 0;vertical-align:top;width:28px;">
            <span style="display:inline-block;width:22px;height:22px;background:#18181b;color:#fff;font-size:11px;font-weight:700;border-radius:50%;text-align:center;line-height:22px;">${i + 1}</span>
          </td>
          <td style="padding:6px 0;font-size:14px;color:#52525b;line-height:1.5;">${step}</td>
        </tr>`).join('')}
      </table>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${opts.loginUrl}" style="display:inline-block;background:#18181b;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.3px;">
          Log In Now →
        </a>
      </div>
    </div>
  `)
}

// ─── Template 2: Team Invite ──────────────────────────────────────────────────

export function teamInviteEmailHtml(opts: {
  companyName: string
  inviterName: string
  role: string
  inviteUrl: string
  expiryDays?: number
}): string {
  const roleLabel = opts.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return baseWrapper(`
    <div style="padding:40px 40px 32px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px;">
        Team Invitation
      </p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#18181b;line-height:1.3;">
        You've been invited to<br />${opts.companyName}
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.7;">
        <strong style="color:#18181b;">${opts.inviterName}</strong> has invited you to join
        <strong style="color:#18181b;">${opts.companyName}</strong> CRM as
        <span style="display:inline-block;background:#f4f4f5;border:1px solid #e4e4e7;color:#18181b;font-weight:700;font-size:13px;padding:2px 10px;border-radius:20px;">${roleLabel}</span>.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${opts.inviteUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">
          Accept Invitation →
        </a>
      </div>

      <!-- Info box -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-bottom:8px;">
        <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
          ✅ This invite link expires in <strong>${opts.expiryDays ?? 7} days</strong>.
          Click the button above to set your password and access your CRM account.
        </p>
      </div>
      <p style="margin:12px 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
        If you weren't expecting this, you can safely ignore this email.
      </p>
    </div>
  `)
}

// ─── Template 3: Password Reset OTP ──────────────────────────────────────────

export function passwordResetEmailHtml(opts: { otp: string }): string {
  return baseWrapper(`
    <div style="padding:40px 40px 32px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:1px;">
        Password Reset
      </p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#18181b;">
        Reset Your Password
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.7;">
        We received a request to reset your Klinq CRM password.
        Use the code below to continue. It is valid for <strong>15 minutes</strong>.
      </p>

      <!-- OTP box -->
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#18181b;color:#ffffff;font-size:36px;font-weight:900;letter-spacing:12px;padding:24px 36px;border-radius:12px;font-family:monospace;">
          ${opts.otp}
        </div>
        <p style="margin:12px 0 0;font-size:13px;color:#71717a;">Valid for 15 minutes only</p>
      </div>

      <!-- Warning -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          🔒 If you did not request this, your account is safe. Simply ignore this email — your password will not change.
        </p>
      </div>
    </div>
  `)
}

// ─── Template 4: Company Suspended ───────────────────────────────────────────

export function companySuspendedEmailHtml(opts: {
  companyName: string
  reason?: string
  supportEmail?: string
}): string {
  return baseWrapper(`
    <!-- Top accent bar - red -->
    <div style="height:4px;background:linear-gradient(90deg,#dc2626,#ef4444);"></div>

    <div style="padding:40px 40px 32px;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;width:56px;height:56px;background:#fef2f2;border:1px solid #fecaca;border-radius:50%;line-height:56px;font-size:24px;">
          ⚠️
        </div>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#18181b;text-align:center;">
        Account Suspended
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.7;text-align:center;">
        Your company <strong style="color:#18181b;">${opts.companyName}</strong>'s Klinq CRM account has been suspended.
      </p>

      ${opts.reason ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
        <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.6;">${opts.reason}</p>
      </div>` : ''}

      <div style="background:#f9f9fb;border:1px solid #e4e4e7;border-radius:12px;padding:20px;text-align:center;">
        <p style="margin:0 0 12px;font-size:14px;color:#52525b;">
          If you believe this is a mistake or need clarification, contact us:
        </p>
        <a href="mailto:${opts.supportEmail ?? 'klinqcrm@gmail.com'}" style="color:#2563eb;font-weight:600;font-size:14px;">
          ${opts.supportEmail ?? 'klinqcrm@gmail.com'}
        </a>
      </div>
    </div>
  `)
}

// ─── Template 5: Company Reactivated ─────────────────────────────────────────

export function companyReactivatedEmailHtml(opts: {
  companyName: string
  loginUrl: string
}): string {
  return baseWrapper(`
    <!-- Top accent bar - green -->
    <div style="height:4px;background:linear-gradient(90deg,#16a34a,#22c55e);"></div>

    <div style="padding:40px 40px 32px;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;width:56px;height:56px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:50%;line-height:56px;font-size:24px;">
          ✅
        </div>
      </div>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#18181b;text-align:center;">
        Access Restored!
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.7;text-align:center;">
        Great news! <strong style="color:#18181b;">${opts.companyName}</strong>'s Klinq CRM account has been reactivated.
        You can now log in and resume your work.
      </p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${opts.loginUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">
          Log In Now →
        </a>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#166534;">
          All your data — leads, contacts, deals, and messages — are exactly as you left them.
          If you experience any issues, contact <a href="mailto:klinqcrm@gmail.com" style="color:#15803d;">klinqcrm@gmail.com</a>.
        </p>
      </div>
    </div>
  `)
}
