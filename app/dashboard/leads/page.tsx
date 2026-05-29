import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/usage/limits'
import { LeadsPageClient } from './leads-page-client'

async function getLeadsData() {
  // Use service client to bypass RLS for server-side render
  const supabase = createServiceClient()
  
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching leads:', error)
    return { leads: [], aiScoringEnabled: false }
  }
  
  // Get active company flag via session client
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  let aiScoringEnabled = false
  if (user) {
    const { data: uac } = await supabase.from('user_active_company' as any).select('company_id').eq('user_id', user.id).single()
    if ((uac as any)?.company_id) {
      aiScoringEnabled = await isFeatureEnabled((uac as any).company_id, 'ai_scoring_enabled')
    }
  }
  
  return { leads: leads || [], aiScoringEnabled }
}

export default async function LeadsPage() {
  const { leads, aiScoringEnabled } = await getLeadsData()
  
  return <LeadsPageClient initialLeads={leads as any} aiScoringEnabled={aiScoringEnabled} />
}
