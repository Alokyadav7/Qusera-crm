import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, companySuspendedEmailHtml } from '@/lib/email'

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

// POST /api/super-admin/companies/suspend
// Body: { company_id, reason? }
export async function POST(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, reason } = await req.json()
  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  const svc = createServiceClient()

  // Get company info
  const { data: company } = await (svc as any)
    .from('companies')
    .select('id, name')
    .eq('id', company_id)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { error } = await (svc as any).from('companies').update({
    is_active: false,
    status: 'suspended',
    suspension_reason: reason?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get company owner email
  const { data: ownerMember } = await (svc as any)
    .from('company_members')
    .select('user_id')
    .eq('company_id', company_id)
    .eq('role', 'owner')
    .single()

  if (ownerMember) {
    const { data: { user: ownerAuth } } = await svc.auth.admin.getUserById(ownerMember.user_id)
    if (ownerAuth?.email) {
      sendEmail({
        to: ownerAuth.email,
        subject: 'Important: Your Klinq CRM account has been suspended',
        html: companySuspendedEmailHtml({
          companyName: company.name,
          reason: reason?.trim() || undefined,
        }),
      }).catch(err => console.error('[Suspension Email] Failed:', err?.message))
    }
  }

  await (svc as any).from('audit_logs').insert({
    action: 'company.suspended',
    resource: 'company',
    user_id: adminUser.id,
    company_id,
    details: { by: adminUser.email, reason: reason?.trim() || null },
  })

  return NextResponse.json({ success: true })
}
