import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/onboarding/complete-step
// Called by onboarding wizard after each step completes
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { step: number; data?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const { step, data: stepData } = body

  // Get the user's company_id
  const { data: uac } = await (supabase as any)
    .from('user_active_company')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  const companyId = (uac as any)?.company_id

  try {
    switch (step) {
      case 0: // Password changed — mark temp_password_used
        await (supabase as any)
          .from('profiles')
          .update({ temp_password_used: true })
          .eq('id', user.id)
        break

      case 1: // Company profile saved
        if (companyId) {
          await (supabase as any)
            .from('companies')
            .update({
              ...(stepData?.name ? { name: stepData.name } : {}),
              ...(stepData?.logo_url !== undefined ? { logo_url: stepData.logo_url } : {}),
              ...(stepData?.timezone ? { timezone: stepData.timezone } : {}),
              ...(stepData?.currency ? { currency: stepData.currency } : {}),
              ...(stepData?.address !== undefined ? { address: stepData.address } : {}),
              ...(stepData?.gstin !== undefined ? { gstin: stepData.gstin } : {}),
              setup_step: 1,
            })
            .eq('id', companyId)
        }
        break

      case 2: // Team invites sent
        if (companyId) {
          await (supabase as any)
            .from('companies')
            .update({ setup_step: 2 })
            .eq('id', companyId)
        }
        break

      case 3: // Integrations step
        if (companyId) {
          await (supabase as any)
            .from('companies')
            .update({ setup_step: 3 })
            .eq('id', companyId)
        }
        break

      case 4: // Final step — mark fully onboarded
        // Update profile
        await (supabase as any)
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id)

        // Update company
        if (companyId) {
          await (supabase as any)
            .from('companies')
            .update({
              setup_complete: true,
              setup_step: 4,
              onboarding_completed_at: new Date().toISOString(),
            })
            .eq('id', companyId)
        }
        break

      default:
        return NextResponse.json(
          { error: `Unknown step: ${step}`, code: 'INVALID_STEP' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, step })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
