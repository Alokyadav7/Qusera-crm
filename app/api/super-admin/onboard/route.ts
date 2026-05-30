import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, onboardingEmailHtml } from '@/lib/email'

async function getSuperAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const svc = createServiceClient()
  const { data: admin } = await svc.from('platform_admins').select('is_active').eq('user_id', user.id).maybeSingle()
  const metaFlag = user.user_metadata?.is_platform_admin === true
  if (!admin?.is_active && !metaFlag) return null
  return user
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  let pwd = ''
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

// POST /api/super-admin/onboard
export async function POST(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { companyName, industry, adminName, adminEmail, adminPhone, employeeCount, plan, customSubdomain } = body

  if (!companyName || !adminName || !adminEmail) {
    return NextResponse.json({ error: 'companyName, adminName, adminEmail are required' }, { status: 400 })
  }

  const svc = createServiceClient()
  const tempPassword = generateTempPassword()

  // 1. Create Supabase Auth user with temp password
  const { data: authData, error: authError } = await svc.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminName,
      phone: adminPhone || null,
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const newUserId = authData.user!.id

  // 2. Create company record
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data: company, error: companyError } = await (svc as any).from('companies').insert({
    name: companyName,
    slug: customSubdomain || slug,
    industry: industry || null,
    owner_id: newUserId,
    status: 'trial',
    is_active: true,
    setup_complete: false,
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single()

  if (companyError) {
    // Rollback auth user
    await svc.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: companyError.message }, { status: 500 })
  }

  // 3. Create profile
  await (svc as any).from('profiles').upsert({
    id: newUserId,
    full_name: adminName,
    email: adminEmail,
    phone: adminPhone || null,
    updated_at: new Date().toISOString(),
  })

  // 4. Create company_members record with owner/admin role
  await (svc as any).from('company_members').insert({
    company_id: company.id,
    user_id: newUserId,
    role: 'owner',
    is_active: true,
    invited_by: adminUser.id,
    created_at: new Date().toISOString(),
  })

  // 5a. Create user_active_company so onboarding page can find the company
  await (svc as any).from('user_active_company').upsert({
    user_id: newUserId,
    company_id: company.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // 5b. Set company_id + is_active on the profile (needed by proxy suspension check)
  await (svc as any).from('profiles').update({
    company_id: company.id,
    is_active: true,
  }).eq('id', newUserId)
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://klinqcrm.in'}/login`

  // Send onboarding email via Gmail SMTP — don't block if it fails
  sendEmail({
    to: adminEmail,
    subject: `Your ${companyName} CRM Account is Ready 🎉`,
    html: onboardingEmailHtml({
      adminName,
      companyName,
      adminEmail,
      tempPassword,
      loginUrl,
    }),
  }).catch(err => console.error('[Onboarding Email] Failed:', err?.message))

  // 6. Audit log
  await (svc as any).from('audit_logs').insert({
    action: 'company.onboarded',
    resource: 'company',
    user_id: adminUser.id,
    company_id: company.id,
    details: {
      company_name: companyName,
      admin_email: adminEmail,
      plan,
      by: adminUser.email,
    },
  })

  return NextResponse.json({
    success: true,
    companyName,
    adminEmail,
    tempPassword,
    loginUrl,
    companyId: company.id,
  })
}
