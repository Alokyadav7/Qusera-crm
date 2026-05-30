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

// POST /api/super-admin/companies/resend
// Resends the onboarding welcome email to the company owner
export async function POST(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id } = await req.json()
  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  const svc = createServiceClient()

  // Get company
  const { data: company } = await (svc as any)
    .from('companies')
    .select('id, name')
    .eq('id', company_id)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  // Get company owner
  const { data: ownerMember } = await (svc as any)
    .from('company_members')
    .select('user_id')
    .eq('company_id', company_id)
    .eq('role', 'owner')
    .single()

  if (!ownerMember) return NextResponse.json({ error: 'Company owner not found' }, { status: 404 })

  // Get owner email from auth
  const { data: { user: ownerAuthUser } } = await svc.auth.admin.getUserById(ownerMember.user_id)
  const adminEmail = ownerAuthUser?.email
  const adminName = ownerAuthUser?.user_metadata?.full_name ?? 'Admin'

  if (!adminEmail) return NextResponse.json({ error: 'Admin email not found' }, { status: 404 })

  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://klinqcrm.in'}/login`

  // Send onboarding email via Gmail SMTP
  const result = await sendEmail({
    to: adminEmail,
    subject: `Welcome to ${company.name} CRM — Your Account is Ready`,
    html: onboardingEmailHtml({
      adminName,
      companyName: company.name,
      adminEmail,
      tempPassword: '(Use the password set during account creation)',
      loginUrl,
    }),
  })

  if (!result.success) {
    console.error('[Resend Onboarding Email] Failed:', result.error)
    return NextResponse.json({ error: 'Failed to send email', detail: result.error }, { status: 500 })
  }

  // Audit log
  await (svc as any).from('audit_logs').insert({
    action: 'company.onboarding_email_resent',
    resource: 'company',
    user_id: adminUser.id,
    company_id,
    details: { admin_email: adminEmail, by: adminUser.email },
  })

  return NextResponse.json({ success: true })
}
