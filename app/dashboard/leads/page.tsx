export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isFeatureEnabled } from '@/lib/usage/limits'
import { LeadsPageClient } from './leads-page-client'

async function getLeadsData() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return { leads: [], aiScoringEnabled: false, profiles: [] }

  const svc = createServiceClient()

  // Resolve this user's company_id and role
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const companyId: string | null = member?.company_id ?? null
  const role: string | null = member?.role ?? null
  if (!companyId) return { leads: [], aiScoringEnabled: false, profiles: [] }

  // Build scoped query
  let query = svc
    .from('leads')
    .select('*')
    .eq('company_id' as any, companyId)

  // Gating check: if not owner, admin, or manager, scope to assigned user
  const isManagerOrAdmin = role && ['owner', 'admin', 'manager'].includes(role)
  if (!isManagerOrAdmin) {
    query = query.eq('assigned_to', user.id)
  }

  const { data: leads, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return { leads: [], aiScoringEnabled: false, profiles: [] }
  }

  // Fetch profiles of all members in the company to map creators/owners
  const { data: profiles } = await (svc as any)
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('company_id', companyId)

  const aiScoringEnabled = await isFeatureEnabled(companyId, 'ai_scoring_enabled')

  return { leads: leads || [], aiScoringEnabled, profiles: profiles || [] }
}

export default async function LeadsPage() {
  const { leads, aiScoringEnabled, profiles } = await getLeadsData()

  return (
    <LeadsPageClient 
      initialLeads={leads as any} 
      aiScoringEnabled={aiScoringEnabled} 
      profiles={profiles}
    />
  )
}
