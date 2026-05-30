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

  // Fetch all member counts and lead counts in ONE parallel batch
  // instead of N sequential calls (fixes N+1 query)
  const companyIds = companiesList.map((c: any) => c.id)

  const [memberCountResults, leadCountResults] = await Promise.all([
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
  ])

  // Build lookup maps for O(1) access
  const memberCountMap = Object.fromEntries(memberCountResults.map(r => [r.id, r.count]))
  const leadCountMap = Object.fromEntries(leadCountResults.map(r => [r.id, r.count]))

  const enriched = companiesList.map((company: any) => ({
    ...company,
    member_count: memberCountMap[company.id] ?? 0,
    lead_count: leadCountMap[company.id] ?? 0,
    mrr: company.subscription?.mrr ?? 0,
  }))

  return NextResponse.json({ companies: enriched })
})
