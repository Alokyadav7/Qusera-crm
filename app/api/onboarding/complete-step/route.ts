import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH /api/onboarding/complete-step
// Called by onboarding wizard after each step completes
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const svc = createServiceClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('[COMPLETE-STEP] Auth error:', userError)
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { step: number; data?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, { status: 400 })
  }

  const { step, data: stepData } = body
  console.log('[COMPLETE-STEP] Step:', step, 'User:', user.email)

  // NOTE: cast to any — database.types.ts is stale and missing these columns
  // (company_id, temp_password_used, onboarding_completed on profiles)
  const { data: profile, error: profileError } = await (svc as any)
    .from('profiles')
    .select('company_id, temp_password_used, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[COMPLETE-STEP] Profile fetch error:', profileError)
  }

  const companyId = (profile as any)?.company_id as string | null

  try {
    switch (step) {
      case 0: {
        // Password changed — mark temp_password_used (non-critical: always return success)
        const { error: dbError } = await (svc as any)
          .from('profiles')
          .update({ temp_password_used: true, updated_at: new Date().toISOString() })
          .eq('id', user.id)
        if (dbError) {
          // Not fatal — the password was already changed in Supabase Auth.
          // Returning success so the wizard always advances.
          console.warn('[COMPLETE-STEP] Step 0 DB update failed (non-fatal):', dbError.message)
        } else {
          console.log('[COMPLETE-STEP] Step 0 complete ✅ (temp_password_used=true)')
        }
        break
      }

      case 1: // Company profile saved
        if (companyId && stepData) {
          const { error: dbError } = await (svc as any)
            .from('companies')
            .update({
              ...(stepData?.name ? { name: stepData.name } : {}),
              ...(stepData?.logo_url !== undefined ? { logo_url: stepData.logo_url } : {}),
              ...(stepData?.timezone ? { timezone: stepData.timezone } : {}),
              ...(stepData?.currency ? { currency: stepData.currency } : {}),
              ...(stepData?.address !== undefined ? { address: stepData.address } : {}),
              ...(stepData?.gstin !== undefined ? { gstin: stepData.gstin } : {}),
              ...(stepData?.industry !== undefined ? { industry: stepData.industry } : {}),
              ...(stepData?.website !== undefined ? { website: stepData.website } : {}),
              setup_step: 1,
            })
            .eq('id', companyId)
          if (dbError) {
            console.error('[COMPLETE-STEP] Step 1 company update error:', dbError.message)
            return NextResponse.json({ error: 'Failed to save company profile: ' + dbError.message }, { status: 500 })
          }
        }
        console.log('[COMPLETE-STEP] Step 1 complete ✅')
        break

      case 2: // Team invites sent
        if (companyId) {
          const { error: dbError } = await svc
            .from('companies')
            .update({ setup_step: 2 } as any)
            .eq('id', companyId)
          if (dbError) console.warn('[COMPLETE-STEP] Step 2 DB update failed (non-fatal):', dbError.message)
        }
        console.log('[COMPLETE-STEP] Step 2 complete ✅')
        break

      case 3: // Integrations step
        if (companyId) {
          const { error: dbError } = await svc
            .from('companies')
            .update({ setup_step: 3 } as any)
            .eq('id', companyId)
          if (dbError) console.warn('[COMPLETE-STEP] Step 3 DB update failed (non-fatal):', dbError.message)
        }
        console.log('[COMPLETE-STEP] Step 3 complete ✅')
        break

      case 4: { // Final step — mark fully onboarded
        const { error: profileUpdateError } = await svc
          .from('profiles')
          .update({ onboarding_completed: true } as any)
          .eq('id', user.id)

        if (profileUpdateError) {
          console.error('[COMPLETE-STEP] Step 4 profile update error:', profileUpdateError.message)
          return NextResponse.json(
            { error: 'Failed to complete onboarding: ' + profileUpdateError.message },
            { status: 500 }
          )
        }

        if (companyId) {
          const { error: companyUpdateError } = await (svc as any)
            .from('companies')
            .update({
              setup_complete: true,
              setup_step: 4,
              onboarding_completed_at: new Date().toISOString(),
            })
            .eq('id', companyId)
          if (companyUpdateError) {
            console.warn('[COMPLETE-STEP] Step 4 company update failed (non-fatal):', companyUpdateError.message)
          }
        }
        console.log('[COMPLETE-STEP] Step 4 FINAL complete ✅')
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown step: ${step}`, code: 'INVALID_STEP' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, step })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[COMPLETE-STEP] Unexpected error at step', step, ':', message)
    return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
