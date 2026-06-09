import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

// ── Auth guard — only platform admins ────────────────────────────────────────
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

// ── POST /api/super-admin/fix-onboarding ─────────────────────────────────────
// Repairs a company owner who is stuck on "Account Setup Incomplete"
// Body: { email?: string } — if omitted, fixes ALL broken owner accounts
export async function POST(req: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const svc = createServiceClient()
  let targetEmail: string | undefined

  try {
    const body = await req.json().catch(() => ({}))
    targetEmail = body.email?.trim()
  } catch {
    // No body — fix all
  }

  try {
    // ── 1: Fetch all broken profiles (have company_id but no user_active_company) ──
    let profilesQuery = (svc as any)
      .from('profiles')
      .select('id, email, role, company_id, onboarding_completed')
      .not('company_id', 'is', null)
      .eq('is_active', true)

    if (targetEmail) {
      profilesQuery = profilesQuery.eq('email', targetEmail)
    } else {
      // Only fix non-super-admins
      profilesQuery = profilesQuery.or('is_super_admin.is.null,is_super_admin.eq.false')
    }

    const { data: profiles, error: profilesError } = await profilesQuery

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: targetEmail
          ? `No profile found for ${targetEmail}`
          : 'No profiles to fix',
        fixed: [],
      })
    }

    const fixed: string[] = []
    const skipped: string[] = []
    const errors: { email: string; error: string }[] = []

    for (const profile of profiles) {
      try {
        const { id: userId, email, company_id: companyId, role } = profile

        // ── Check what's missing ──────────────────────────────────────────────
        const [uacRes, memberRes, companyRes] = await Promise.all([
          (svc as any).from('user_active_company').select('user_id').eq('user_id', userId).maybeSingle(),
          (svc as any).from('company_members').select('user_id').eq('user_id', userId).eq('company_id', companyId).maybeSingle(),
          (svc as any).from('companies').select('id, is_active, name').eq('id', companyId).maybeSingle(),
        ])

        const company = companyRes.data
        if (!company?.is_active) {
          skipped.push(`${email} (company inactive/not found)`)
          continue
        }

        let repaired = false

        // ── Fix missing user_active_company ───────────────────────────────────
        if (!uacRes.data) {
          const { error: uacError } = await (svc as any)
            .from('user_active_company')
            .upsert(
              { user_id: userId, company_id: companyId, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            )
          if (uacError) throw new Error(`user_active_company upsert failed: ${uacError.message}`)
          repaired = true
        }

        // ── Fix missing company_members ───────────────────────────────────────
        if (!memberRes.data) {
          const { error: memberError } = await (svc as any)
            .from('company_members')
            .upsert(
              {
                user_id: userId,
                company_id: companyId,
                role: role || 'owner',
                is_active: true,
                invited_by: adminUser.id,
                joined_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              },
              { onConflict: 'user_id, company_id' }
            )
          if (memberError) throw new Error(`company_members upsert failed: ${memberError.message}`)
          repaired = true
        }

        if (repaired) {
          fixed.push(email)
          console.log(`[fix-onboarding] ✅ Repaired ${email} → company: ${company.name}`)
        } else {
          skipped.push(`${email} (already had all rows)`)
        }
      } catch (err: any) {
        errors.push({ email: profile.email, error: err.message })
        console.error(`[fix-onboarding] ❌ Failed to fix ${profile.email}:`, err.message)
      }
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await (svc as any).from('audit_logs').insert({
      action: 'admin.fix_onboarding',
      resource: 'profile',
      user_id: adminUser.id,
      details: {
        target_email: targetEmail || 'all',
        fixed_count: fixed.length,
        fixed_emails: fixed,
        errors,
        by: adminUser.email,
      },
    }).catch(() => {}) // non-fatal

    return NextResponse.json({
      success: true,
      fixed,
      skipped,
      errors,
      summary: `Fixed ${fixed.length} account(s). ${skipped.length} skipped. ${errors.length} error(s).`,
    })

  } catch (error: any) {
    console.error('[fix-onboarding] Fatal error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Fix failed', code: 'FIX_FAILED' },
      { status: 500 }
    )
  }
}
