// ── Klinq CRM — Super Admin Onboard Route ─────────────────────────────────
// Uses the SERVICE ROLE key (bypasses RLS) for all DB writes.
// database.types.ts is intentionally incomplete; we cast to `any` for tables
// that have columns not yet reflected in the generated types.

import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Auth guard — only platform admins can call this route ─────────────────
async function getSuperAdminUser(_req: NextRequest) {
  const { createClient } = await import('@/lib/supabase/server')
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

// ── Temp password generator ──────────────────────────────────────────────
function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const nums = '23456789'
  const special = '@#$!'
  const all = upper + lower + nums + special

  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    special[Math.floor(Math.random() * special.length)]

  for (let i = 0; i < 8; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// ── POST /api/super-admin/onboard ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const adminUser = await getSuperAdminUser(req)
  if (!adminUser) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  // MUST use service client — bypasses RLS for all DB writes
  const svc = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = svc as any  // database.types.ts is missing many real columns

  let createdCompanyId: string | null = null
  let createdAuthUserId: string | null = null

  try {
    const body = await req.json()
    const {
      companyName,
      industry,
      employeeCount,
      plan,
      customSubdomain,
      logoUrl,
      adminName,
      adminEmail,
      adminPhone,
    } = body

    // ── Validate ─────────────────────────────────────────────────────────
    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: 'Company name is required', code: 'MISSING_COMPANY_NAME' },
        { status: 400 }
      )
    }
    if (!adminName?.trim()) {
      return NextResponse.json(
        { error: 'Admin name is required', code: 'MISSING_ADMIN_NAME' },
        { status: 400 }
      )
    }
    if (!adminEmail?.trim()) {
      return NextResponse.json(
        { error: 'Admin email is required', code: 'MISSING_ADMIN_EMAIL' },
        { status: 400 }
      )
    }

    const cleanEmail = adminEmail.trim().toLowerCase()

    // ── Check email not already used ─────────────────────────────────────
    const { data: existingProfile } = await db
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        {
          error: `Email ${cleanEmail} is already registered. Use a different email.`,
          code: 'EMAIL_EXISTS',
        },
        { status: 400 }
      )
    }

    // ── STEP 1: Create company ────────────────────────────────────────────
    console.log('[ONBOARD] Creating company:', companyName)

    const slug = (customSubdomain || companyName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: company, error: companyError } = await db
      .from('companies')
      .insert({
        name: companyName.trim(),
        slug,
        industry: industry || null,
        employee_count: employeeCount || null,
        plan: plan || 'basic',
        custom_subdomain: customSubdomain?.toLowerCase().trim() || null,
        logo_url: logoUrl || null,
        is_active: true,
        setup_complete: false,
        setup_step: 0,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, name')
      .single()

    console.log(
      '[ONBOARD] Step 1 - Company:',
      company ? `Created ${company.id}` : 'FAILED',
      companyError?.message
    )

    if (companyError || !company) {
      throw new Error(`Company creation failed: ${companyError?.message}`)
    }

    createdCompanyId = company.id

    // ── STEP 2: Generate temp password ────────────────────────────────────
    const tempPassword = generateSecurePassword()
    console.log('[ONBOARD] Password generated')

    // ── STEP 3: Create auth user ──────────────────────────────────────────
    console.log('[ONBOARD] Creating auth user:', cleanEmail)

    const { data: authData, error: authError } = await svc.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,          // skip email confirmation — owner logs in directly
      user_metadata: {
        full_name: adminName.trim(),
        company_id: company.id,
        phone: adminPhone?.trim() || null,
      },
    })

    console.log(
      '[ONBOARD] Step 2 - Auth User:',
      authData?.user ? `Created ${authData.user.id}` : 'FAILED',
      authError?.message
    )

    if (authError || !authData?.user) {
      throw new Error(`Auth user creation failed: ${authError?.message}`)
    }

    createdAuthUserId = authData.user.id

    // Set owner_id on company now that we have the user id
    await db
      .from('companies')
      .update({ owner_id: createdAuthUserId, updated_at: new Date().toISOString() })
      .eq('id', company.id)

    // ── STEP 4: Create profiles row ───────────────────────────────────────
    // THIS IS THE ROW MIDDLEWARE READS — company_id MUST be set here
    console.log('[ONBOARD] Creating profile...')

    const { error: profileError } = await db
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          email: cleanEmail,
          full_name: adminName.trim(),
          phone: adminPhone?.trim() || null,
          company_id: company.id,        // CRITICAL: links user to their company
          role: 'owner',                 // CRITICAL: grants owner permissions
          is_active: true,
          is_super_admin: false,
          onboarding_completed: false,   // forces /onboarding redirect on first login
          temp_password_used: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    console.log(
      '[ONBOARD] Step 3 - Profile:',
      profileError ? `FAILED: ${profileError.message}` : 'Created'
    )

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    // ── STEP 5: Create company_members row ────────────────────────────────
    console.log('[ONBOARD] Creating company member...')

    const { error: memberError } = await db
      .from('company_members')
      .upsert(
        {
          user_id: authData.user.id,
          company_id: company.id,
          role: 'owner',
          is_active: true,
          invited_by: adminUser.id,
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, company_id' }
      )

    console.log(
      '[ONBOARD] Step 4 - Member:',
      memberError ? `FAILED: ${memberError.message}` : 'Created'
    )

    if (memberError) {
      throw new Error(`Company member creation failed: ${memberError.message}`)
    }

    // ── STEP 6: Create user_active_company row ────────────────────────────
    console.log('[ONBOARD] Creating active company...')

    const { error: activeError } = await db
      .from('user_active_company')
      .upsert(
        {
          user_id: authData.user.id,
          company_id: company.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    console.log(
      '[ONBOARD] Step 5 - Active Company:',
      activeError ? `FAILED: ${activeError.message}` : 'Created'
    )

    if (activeError) {
      throw new Error(`User active company creation failed: ${activeError.message}`)
    }

    // ── STEP 7: Verify all rows were actually created ─────────────────────
    console.log('[ONBOARD] Verifying all rows...')

    const [profileCheck, memberCheck, activeCheck] = await Promise.all([
      db.from('profiles').select('id, company_id, role').eq('id', authData.user.id).single(),
      db.from('company_members').select('id').eq('user_id', authData.user.id).eq('company_id', company.id).single(),
      db.from('user_active_company').select('company_id').eq('user_id', authData.user.id).single(),
    ])

    const verificationFailed: string[] = []

    if (!profileCheck.data?.company_id) verificationFailed.push('profiles.company_id is null')
    if (!memberCheck.data) verificationFailed.push('company_members row missing')
    if (!activeCheck.data) verificationFailed.push('user_active_company row missing')

    if (verificationFailed.length > 0) {
      console.error('[ONBOARD] Verification FAILED:', verificationFailed)
      throw new Error(`Setup verification failed: ${verificationFailed.join(', ')}`)
    }

    console.log('[ONBOARD] All rows verified ✅')

    // ── STEP 8: Send onboarding email (non-fatal) ─────────────────────────
    console.log('[ONBOARD] Sending email to:', cleanEmail)

    const loginUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://klinqcrm.in'

    let emailSent = false
    let emailError: string | undefined

    try {
      const emailResult = await sendEmail({
        to: cleanEmail,
        subject: `Your ${companyName} CRM is Ready 🎉`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">

  <h2>Welcome to Klinq CRM, ${adminName}!</h2>

  <p style="color: #555;">
    Your company <strong>${companyName}</strong> has been set up on Klinq CRM.
  </p>

  <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0;">
    <p style="margin: 0 0 12px; color: #444;">
      <strong>Login URL:</strong><br>
      <a href="${loginUrl}/login" style="color: #2563eb;">${loginUrl}/login</a>
    </p>
    <p style="margin: 12px 0; color: #444;">
      <strong>Your Email:</strong><br>
      ${cleanEmail}
    </p>
    <p style="margin: 12px 0; color: #444;">
      <strong>Temporary Password:</strong><br>
      <code style="background: #fef3c7; padding: 6px 12px; border-radius: 4px;
                   font-size: 20px; letter-spacing: 2px; font-weight: bold;">
        ${tempPassword}
      </code>
    </p>
  </div>

  <div style="background: #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 24px;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
      ⚠️ You will be asked to change this password on first login. Expires in 7 days.
    </p>
  </div>

  <h3>Get started in 3 steps:</h3>
  <ol style="color: #555; line-height: 2.2;">
    <li>Log in and change your password</li>
    <li>Complete your company profile</li>
    <li>Invite your team members</li>
  </ol>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${loginUrl}/login"
       style="background: #111; color: white; padding: 14px 36px;
              border-radius: 6px; text-decoration: none;
              font-weight: bold; font-size: 16px;">
      Log In Now →
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    Need help? Contact us:<br>
    📧 klinqcrm@gmail.com | 💬 WhatsApp: 8603058090<br><br>
    Powered by Klinq CRM
  </p>

</body>
</html>`,
      })
      emailSent = emailResult.success
      if (!emailResult.success) {
        emailError = emailResult.error
        console.error('[ONBOARD] Email FAILED:', emailResult.error)
      } else {
        console.log('[ONBOARD] Email sent ✅ — MessageId:', emailResult.messageId)
      }
    } catch (emailEx: any) {
      emailError = emailEx.message
      console.error('[ONBOARD] Email exception:', emailEx.message)
    }

    // ── STEP 9: Audit log (non-fatal) ─────────────────────────────────────
    await db
      .from('audit_logs')
      .insert({
        action: 'company.onboarded',
        resource: 'company',
        user_id: adminUser.id,
        company_id: company.id,
        details: {
          company_name: companyName,
          admin_email: cleanEmail,
          plan: plan || 'basic',
          by: adminUser.email,
        },
      })
      .then(() => {/* ok */})
      .catch((e: any) => console.warn('[ONBOARD] Audit log failed (non-fatal):', e.message))

    console.log('[ONBOARD] Complete ✅✅✅')

    // ── SUCCESS ──────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      companyId: company.id,
      companyName: companyName,
      adminEmail: cleanEmail,
      tempPassword,
      loginUrl: `${loginUrl}/login`,
      emailSent,
      emailError,
      verification: {
        profile: true,
        member: true,
        activeCompany: true,
      },
    })

  } catch (error: any) {
    console.error('[ONBOARD] FATAL ERROR:', error.message)

    // Best-effort rollback if partially created
    if (createdAuthUserId) {
      console.log('[ONBOARD] Rolling back auth user...')
      await svc.auth.admin
        .deleteUser(createdAuthUserId)
        .catch((e: any) => console.error('[ONBOARD] Rollback auth failed:', e.message))
    }
    if (createdCompanyId) {
      console.log('[ONBOARD] Rolling back company...')
      await db
        .from('companies')
        .delete()
        .eq('id', createdCompanyId)
        .then(() => {/* ok */})
        .catch((e: any) => console.error('[ONBOARD] Rollback company failed:', e.message))
    }

    return NextResponse.json(
      {
        error: error.message || 'Onboarding failed. Please try again.',
        code: 'ONBOARD_FAILED',
      },
      { status: 500 }
    )
  }
}
