import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/companies — List all companies with stats
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

  // Cast needed because Supabase can't infer nested joins without FK Relationships defined
  const companiesList = (companies ?? []) as any[]

  // Enrich with member count
  const enriched = await Promise.all(
    companiesList.map(async (company: any) => {
      const { count: memberCount } = await svc
        .from('company_members')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('is_active', true)
        .is('deleted_at', null)

      const { count: leadCount } = await svc
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .is('deleted_at', null)

      return {
        ...company,
        member_count: memberCount ?? 0,
        lead_count: leadCount ?? 0,
        mrr: company.subscription?.mrr ?? 0,
      }
    })
  )

  return NextResponse.json({ companies: enriched })
})
