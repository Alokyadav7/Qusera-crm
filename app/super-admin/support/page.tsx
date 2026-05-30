import { createServiceClient } from '@/lib/supabase/service'
import { SupportCenterClient } from './support-client'

export const dynamic = 'force-dynamic'

async function getSupportData() {
  const svc = createServiceClient()

  const { data: companies } = await svc
    .from('companies')
    .select('id, name, slug, status, setup_complete, health_status')
    .is('deleted_at', null)
    .order('name')

  return {
    companies: (companies as any[]) ?? [],
  }
}

export default async function SupportCenterPage() {
  const data = await getSupportData()
  return <SupportCenterClient companies={data.companies} />
}
