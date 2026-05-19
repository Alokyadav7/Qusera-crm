import { createClient } from '@/lib/supabase/server'
import { LeadsPageClient } from './leads-page-client'

async function getLeadsData() {
  const supabase = await createClient()
  
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching leads:', error)
    return []
  }
  
  return leads || []
}

export default async function LeadsPage() {
  const leads = await getLeadsData()
  
  return <LeadsPageClient initialLeads={leads} />
}
