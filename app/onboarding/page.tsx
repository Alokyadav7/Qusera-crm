import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/crm/onboarding-wizard'
import Link from 'next/link'
import { Mail } from 'lucide-react'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get profile flags
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('onboarding_completed, temp_password_used')
    .eq('id', user.id)
    .maybeSingle()

  // Already onboarded → dashboard (middleware also catches this)
  if (profile?.onboarding_completed) redirect('/dashboard')

  // Get the user's company via user_active_company
  const { data: uac } = await (supabase as any)
    .from('user_active_company')
    .select('company_id, company:companies(id, setup_complete, setup_step, onboarding_completed_at)')
    .eq('user_id', user.id)
    .single()

  const company = (uac as any)?.company

  // No company found — user was not properly onboarded by admin.
  // Do NOT auto-create a company. Show error with support contact.
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
          <Link
            href="/login"
            className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    )
  }

  // Determine starting step
  // Step 0 = force password change (if temp password not yet changed)
  // Step 1+ = normal wizard steps
  const passwordChanged = profile?.temp_password_used === true
  const initialStep = passwordChanged
    ? Math.min(Math.max((company as any).setup_step || 1, 1), 4)
    : 0

  return (
    <OnboardingWizard
      companyId={(company as any).id}
      initialStep={initialStep}
    />
  )
}
