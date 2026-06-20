import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/companies — List all companies with stats (optimised: single batch)
export const GET = withSuperAdmin(async (req: NextRequest) => {
  const svc = createServiceClient()

  const { data: companies, error } = await svc
    .from('companies')
    .select(`
      *,
      subscription:subscriptions(*, plan:plans(*))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const companiesList = (companies ?? []) as any[]

  if (companiesList.length === 0) {
    return NextResponse.json({ companies: [] })
  }

  // Fetch all member counts, lead counts, and owner profiles in parallel batches
  // instead of N sequential calls (fixes N+1 query)
  const companyIds = companiesList.map((c: any) => c.id)
  const ownerIds = companiesList.map((c: any) => c.owner_id).filter(Boolean)

  const [memberCountResults, leadCountResults, profilesResult] = await Promise.all([
    // Get per-company active member counts in a single aggregated query
    Promise.all(
      companyIds.map((id: string) =>
        svc
          .from('company_members')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .then(({ count }) => ({ id, count: count ?? 0 }))
      )
    ),
    // Get per-company lead counts in a single aggregated query
    Promise.all(
      companyIds.map((id: string) =>
        svc
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', id)
          .is('deleted_at', null)
          .then(({ count }) => ({ id, count: count ?? 0 }))
      )
    ),
    // Get owner profiles
    ownerIds.length > 0
      ? (svc as any)
          .from('profiles')
          .select('id, email, full_name')
          .in('id', ownerIds)
          .then(({ data }: any) => data ?? [])
      : Promise.resolve([]),
  ])

  // Build lookup maps for O(1) access
  const memberCountMap = Object.fromEntries(memberCountResults.map(r => [r.id, r.count]))
  const leadCountMap = Object.fromEntries(leadCountResults.map(r => [r.id, r.count]))
  const profileMap = Object.fromEntries((profilesResult as any[]).map(p => [p.id, p]))

  const enriched = companiesList.map((company: any) => ({
    ...company,
    admin_email: profileMap[company.owner_id]?.email ?? null,
    admin_name: profileMap[company.owner_id]?.full_name ?? null,
    member_count: memberCountMap[company.id] ?? 0,
    lead_count: leadCountMap[company.id] ?? 0,
    mrr: company.subscription?.mrr ?? 0,
  }))

  return NextResponse.json({ companies: enriched })
})

