import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { emitEvent } from '@/lib/events/emit'
import { enqueueJob } from '@/lib/jobs/enqueue'

// POST /api/onboarding/setup
// Creates company + workspace + makes user the owner
// Called from the onboarding wizard on final step
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { companyName, industry, teamSize, currency, timezone, phone, website } = body

  if (!companyName?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const svc = createServiceClient()

  // ── Check: user already has a company ──────────────────────────────────
  const { data: existingMember } = await svc
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .is('deleted_at', null)
    .maybeSingle()

  if (existingMember) {
    return NextResponse.json({ error: 'You already own a company. Use the org switcher to add another.' }, { status: 409 })
  }

  // ── Create slug from company name ──────────────────────────────────────
  const baseSlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  // Ensure slug uniqueness
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { count } = await svc
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    if (!count) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // ── Create company ──────────────────────────────────────────────────────
  const { data: company, error: companyError } = await svc
    .from('companies')
    .insert({
      name: companyName.trim(),
      slug,
      owner_id: user.id,
      status: 'trial',
      currency: currency ?? 'INR',
      timezone: timezone ?? 'Asia/Kolkata',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    })
    .select('id, name, slug')
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: companyError?.message ?? 'Failed to create company' }, { status: 500 })
  }

  // ── Create default workspace ────────────────────────────────────────────
  const { data: workspace, error: wsError } = await svc
    .from('workspaces')
    .insert({
      company_id: company.id,
      name: 'Main Workspace',
      slug: 'main',
      type: 'sales',
      is_default: true,
    })
    .select('id')
    .single()

  if (wsError) {
    console.error('[onboarding] workspace error:', wsError.message)
  }

  // ── Add user as owner member ────────────────────────────────────────────
  await svc.from('company_members').insert({
    company_id: company.id,
    user_id: user.id,
    role: 'owner',
    is_active: true,
    joined_at: new Date().toISOString(),
  })

  // ── Set as active company ───────────────────────────────────────────────
  await svc.from('user_active_company').upsert({
    user_id: user.id,
    company_id: company.id,
    workspace_id: workspace?.id ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // ── Update profile ──────────────────────────────────────────────────────
  await svc.from('profiles').upsert({
    id: user.id,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  // ── Emit event ──────────────────────────────────────────────────────────
  void emitEvent({
    companyId: company.id,
    actorId: user.id,
    actorType: 'user',
    eventType: 'company.created',
    resourceType: 'company',
    resourceId: company.id,
    resourceLabel: company.name,
    metadata: { industry, teamSize, currency, phone, website },
  })

  // ── Queue welcome email ─────────────────────────────────────────────────
  void enqueueJob({
    companyId: company.id,
    type: 'send_email',
    payload: {
      to: user.email ?? '',
      template: 'welcome',
      data: { companyName: company.name, userName: user.user_metadata?.full_name ?? user.email },
    },
    priority: 9,
    createdBy: user.id,
  })

  return NextResponse.json({
    success: true,
    company: { id: company.id, name: company.name, slug: company.slug },
    workspaceId: workspace?.id,
  })
}
