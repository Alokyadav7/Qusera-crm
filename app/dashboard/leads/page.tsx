export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isFeatureEnabled } from '@/lib/usage/limits'
import { LeadsPageClient } from './leads-page-client'

async function getLeadsData() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return { leads: [], aiScoringEnabled: false }

  const svc = createServiceClient()

  // Resolve this user's company_id — required for multi-tenant isolation
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const companyId: string | null = member?.company_id ?? null
  if (!companyId) return { leads: [], aiScoringEnabled: false }

  // Fetch leads scoped to this company only
  const { data: leads, error } = await svc
    .from('leads')
    .select('*')
    .eq('company_id' as any, companyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return { leads: [], aiScoringEnabled: false }
  }

  const aiScoringEnabled = await isFeatureEnabled(companyId, 'ai_scoring_enabled')

  return { leads: leads || [], aiScoringEnabled }
}

export default async function LeadsPage() {
  const { leads, aiScoringEnabled } = await getLeadsData()

  return <LeadsPageClient initialLeads={leads as any} aiScoringEnabled={aiScoringEnabled} />
}
