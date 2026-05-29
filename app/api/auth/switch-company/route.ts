import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/auth/switch-company
// Switch the active company for the current user (org switcher)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { companyId } = await req.json()
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Verify user is an active member of the target company
  const { data: member } = await svc
    .from('company_members')
    .select('id, role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (!member) {
    return NextResponse.json(
      { error: 'You are not a member of this company' },
      { status: 403 }
    )
  }

  // Get the default workspace for the company
  const { data: defaultWorkspace } = await svc
    .from('workspaces')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_default', true)
    .is('deleted_at', null)
    .single()

  // Update user's active company
  const { error } = await svc
    .from('user_active_company')
    .upsert({
      user_id: user.id,
      company_id: companyId,
      workspace_id: defaultWorkspace?.id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, companyId })
}
