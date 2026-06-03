import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

// ── Auth guard — only platform admins can onboard ────────────────────────────
async function getSuperAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const svc = createServiceClient()
  const { data: admin } = await svc
    .from('platform_admins')
    .select('is_active')
    .eq('user_id', user.id)
    .maybeSingle()
  const metaFlag =
    user.user_metadata?.is_platform_admin === true ||
    user.app_metadata?.is_platform_admin === true
  if (!admin?.is_active && !metaFlag) return null
  return user
}

// ── Temp password generator ──────────────────────────────────────────────────
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#'
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// ── Post-onboarding health check ─────────────────────────────────────────────
async function verifyOnboarding(
  userId: string,
  companyId: string
): Promise<{ success: boolean; missing: string[] }> {
  const svc = createServiceClient()
  const missing: string[] = []

  const [profileRes, memberRes, activeRes, companyRes] = await Promise.all([
    (svc as any).from('profiles').select('id, company_id').eq('id', userId).maybeSingle(),
    (svc as any).from('company_members').select('id').eq('user_id', userId).eq('company_id', companyId).maybeSingle(),
    (svc as any).from('user_active_company').select('company_id').eq('user_id', userId).maybeSingle(),
    (svc as any).from('companies').select('id, is_active').eq('id', companyId).maybeSingle(),
  ])

  if (!(profileRes.data as any)?.company_id) missing.push('profiles.company_id')
  if (!memberRes.data) missing.push('company_members')
  if (!activeRes.data) missing.push('user_active_company')
  if (!(companyRes.data as any)?.is_active) missing.push('companies.is_active')

  return { success: missing.length === 0, missing }
}

// ── POST /api/super-admin/onboard ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json()
  const {
    companyName,
    industry,
    adminName,
    adminEmail,
    adminPhone,
    employeeCount,
    plan,
    customSubdomain,
  } = body

  if (!companyName || !adminName || !adminEmail) {
    return NextResponse.json({
      error: 'Company name, admin name and email are required',
      code: 'MISSING_FIELDS',
    }, { status: 400 })
  }

  const svc = createServiceClient()
  let company: any = null
  let authUserId: string | null = null

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: Create company record
    // ──────────────────────────────────────────────────────────────────────────
    const slug = (customSubdomain || companyName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: newCompany, error: companyError } = await (svc as any)
      .from('companies')
      .insert({
        name: companyName,
        slug,
        industry: industry || null,
        status: 'trial',
        is_active: true,
        setup_complete: false,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (companyError) {
      throw new Error(`Company creation failed: ${companyError.message}`)
    }
    company = newCompany

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: Generate temp password + create auth user
    // ──────────────────────────────────────────────────────────────────────────
    const tempPassword = generateTempPassword()

    const { data: authData, error: authError } = await svc.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,           // skip email confirmation — owner logs in directly
      user_metadata: {
        full_name: adminName,
        company_id: company.id,
        phone: adminPhone || null,
      },
    })

    if (authError) {
      // Rollback company
      await (svc as any).from('companies').delete().eq('id', company.id)
      throw new Error(`Auth user creation failed: ${authError.message}`)
    }

    authUserId = authData.user!.id

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: Set owner_id on company now that we have the user id
    // ──────────────────────────────────────────────────────────────────────────
    await (svc as any)
      .from('companies')
      .update({ owner_id: authUserId, updated_at: new Date().toISOString() })
      .eq('id', company.id)

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: Create profiles row  ← THIS WAS MISSING company_id + role
    // ──────────────────────────────────────────────────────────────────────────
    const { error: profileError } = await (svc as any)
      .from('profiles')
      .upsert({
        id: authUserId,
        email: adminEmail,
        full_name: adminName,
        phone: adminPhone || null,
        company_id: company.id,       // ← CRITICAL: links user to company
        role: 'owner',                // ← CRITICAL: sets role
        is_active: true,
        is_super_admin: false,
        onboarding_completed: false,  // ← CRITICAL: forces /onboarding redirect
        temp_password_used: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 5: Create company_members row  ← WAS SILENTLY FAILING
    // ──────────────────────────────────────────────────────────────────────────
    const { error: memberError } = await (svc as any)
      .from('company_members')
      .upsert({
        user_id: authUserId,
        company_id: company.id,
        role: 'owner',
        is_active: true,
        invited_by: adminUser.id,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id, company_id' })

    if (memberError) {
      throw new Error(`Company member creation failed: ${memberError.message}`)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: Create user_active_company row  ← WAS SILENTLY FAILING
    // ──────────────────────────────────────────────────────────────────────────
    const { error: activeError } = await (svc as any)
      .from('user_active_company')
      .upsert({
        user_id: authUserId,
        company_id: company.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (activeError) {
      throw new Error(`User active company creation failed: ${activeError.message}`)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 7: Verify all rows were actually created
    // ──────────────────────────────────────────────────────────────────────────
    const check = await verifyOnboarding(authUserId, company.id)
    if (!check.success) {
      throw new Error(`Onboarding verification failed. Missing: ${check.missing.join(', ')}`)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 8: Send onboarding email (non-fatal)
    // ──────────────────────────────────────────────────────────────────────────
    const loginUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://klinqcrm.in'

    let emailSent = false
    let emailError: string | undefined

    try {
      const emailResult = await sendEmail({
        to: adminEmail,
        subject: `Your ${companyName} CRM Account is Ready 🎉`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fff;">
  <h2 style="color:#111;">Welcome to Klinq CRM, ${adminName}!</h2>
  <p style="color:#444;">Your company <strong>${companyName}</strong> has been set up on Klinq CRM.</p>
  <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 8px;color:#666;"><strong>Login URL:</strong><br>
      <a href="${loginUrl}/login" style="color:#2563eb;">${loginUrl}/login</a>
    </p>
    <p style="margin:8px 0;color:#666;"><strong>Email:</strong><br>${adminEmail}</p>
    <p style="margin:8px 0;color:#666;"><strong>Temporary Password:</strong><br>
      <code style="background:#fef3c7;padding:4px 8px;border-radius:4px;font-size:18px;letter-spacing:2px;">${tempPassword}</code>
    </p>
  </div>
  <div style="background:#fef3c7;border-radius:6px;padding:12px;margin-bottom:20px;">
    <p style="margin:0;color:#92400e;font-size:14px;">⚠️ You will be asked to change this password on first login. This password expires in 7 days.</p>
  </div>
  <h3 style="color:#111;">Get started in 3 steps:</h3>
  <ol style="color:#444;line-height:2;">
    <li>Log in and change your password</li>
    <li>Complete your company profile</li>
    <li>Invite your team members</li>
  </ol>
  <div style="text-align:center;margin:24px 0;">
    <a href="${loginUrl}/login" style="background:#111;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">Log In Now →</a>
  </div>
  <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
  <p style="color:#999;font-size:12px;text-align:center;">Need help? Contact us at klinqcrm@gmail.com or WhatsApp: 8603058090<br>Powered by Klinq CRM</p>
</body>
</html>`,
      })
      emailSent = emailResult.success
      if (!emailResult.success) {
        emailError = emailResult.error
        console.error('[Onboarding Email] FAILED to send to', adminEmail, '—', emailResult.error)
      } else {
        console.log('[Onboarding Email] Sent to', adminEmail, '— MessageId:', emailResult.messageId)
      }
    } catch (emailEx: any) {
      emailError = emailEx.message
      console.error('[Onboarding Email] Exception:', emailEx.message)
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 9: Audit log (non-fatal)
    // ──────────────────────────────────────────────────────────────────────────
    await (svc as any).from('audit_logs').insert({
      action: 'company.onboarded',
      resource: 'company',
      user_id: adminUser.id,
      company_id: company.id,
      details: {
        company_name: companyName,
        admin_email: adminEmail,
        plan: plan || 'basic',
        by: adminUser.email,
      },
    }).catch((e: any) => console.warn('[Audit Log] Insert failed (non-fatal):', e.message))

    // ──────────────────────────────────────────────────────────────────────────
    // SUCCESS
    // ──────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      companyId: company.id,
      companyName,
      adminEmail,
      tempPassword,    // shown once in UI — never shown again
      loginUrl: `${loginUrl}/login`,
      emailSent,
      emailError,
    })

  } catch (error: any) {
    console.error('[Onboarding] FAILED:', error.message)

    // Best-effort cleanup if partially created
    if (authUserId) {
      await svc.auth.admin.deleteUser(authUserId).catch(() => { })
    }
    if (company?.id) {
      await (svc as any).from('companies').delete().eq('id', company.id).catch(() => { })
    }

    return NextResponse.json({
      error: error.message || 'Onboarding failed. Please try again.',
      code: 'ONBOARD_FAILED',
    }, { status: 500 })
  }
}
