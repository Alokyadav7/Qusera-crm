export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/crm/onboarding-wizard'
import { Mail } from 'lucide-react'
import { SignOutButton } from '@/components/crm/sign-out-button'

async function getSupportEmail(): Promise<string> {
  try {
    const svc = createServiceClient()
    const { data } = await (svc as any)
      .from('platform_settings')
      .select('support_email')
      .eq('id', 1)
      .single()
    return (data as any)?.support_email ?? 'support@Klinq.app'
  } catch {
    return 'support@Klinq.app'
  }
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  // Use getSession() — reads from cookie, no network call to Supabase auth server.
  // Middleware already validated routing; all DB queries use service client (RLS bypassed).
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  // Always use service client so RLS never blocks these reads
  const svc = createServiceClient()

  // Get profile flags
  const { data: profile } = await (svc as any)
    .from('profiles')
    .select('onboarding_completed, temp_password_used, company_id')
    .eq('id', user.id)
    .maybeSingle()

  // Already onboarded → go to dashboard
  if (profile?.onboarding_completed) redirect('/dashboard')

  // Get the user's company via user_active_company
  // Use SERVICE CLIENT — anon client RLS blocks the nested companies join silently
  let { data: uac } = await (svc as any)
    .from('user_active_company')
    .select('company_id, company:companies(id, setup_complete, setup_step, onboarding_completed_at)')
    .eq('user_id', user.id)
    .single()

  // Self-repair: user_active_company row is missing but profile has company_id
  if (!uac && profile?.company_id) {
    console.log('[ONBOARDING] Self-repair: creating missing rows for', user.id)

    // Re-create user_active_company
    await (svc as any)
      .from('user_active_company')
      .upsert(
        { user_id: user.id, company_id: profile.company_id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    // Re-create company_members (with 'owner' role — this table allows 'owner')
    await (svc as any)
      .from('company_members')
      .upsert(
        {
          user_id: user.id,
          company_id: profile.company_id,
          role: 'owner',
          is_active: true,
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, company_id' }
      )

    // Retry fetching after repair
    const { data: refetchedUac } = await (svc as any)
      .from('user_active_company')
      .select('company_id, company:companies(id, setup_complete, setup_step, onboarding_completed_at)')
      .eq('user_id', user.id)
      .single()
    uac = refetchedUac
  }

  // Resolve the company object
  let company = (uac as any)?.company

  // Last-resort fallback: look up company directly from profiles.company_id
  if (!company && profile?.company_id) {
    const { data: directCompany } = await (svc as any)
      .from('companies')
      .select('id, setup_complete, setup_step, onboarding_completed_at')
      .eq('id', profile.company_id)
      .single()
    company = directCompany
  }

  // No company found — admin did not finish onboarding this user
  if (!company) {
    const supportEmail = await getSupportEmail()
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="size-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Account Setup Incomplete</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Your account was created but workspace setup is not complete.
              Please contact your administrator to finish the setup process.
            </p>
          </div>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Mail className="size-4" />
            Contact Administrator
          </a>
          <SignOutButton />
        </div>
      </div>
    )
  }

  // Step 0 = force password change (temp password not yet changed)
  // Step 1+ = normal onboarding wizard steps
  //
  // IMPORTANT: setup_step stores the LAST COMPLETED step (e.g. after completing
  // Step 1 it is set to 1). So we must add 1 to get the NEXT step to show.
  // Without +1 users get sent back to the step they just finished (off-by-one bug).
  const passwordChanged = profile?.temp_password_used === true
  const lastCompletedStep = (company as any).setup_step ?? 0
  const initialStep = passwordChanged
    ? Math.min(Math.max(lastCompletedStep + 1, 1), 4)
    : 0

  return (
    <OnboardingWizard
      companyId={(company as any).id}
      initialStep={initialStep}
    />
  )
}
