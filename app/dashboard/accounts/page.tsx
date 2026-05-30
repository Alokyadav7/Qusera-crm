import { createServiceClient } from '@/lib/supabase/service'
import { AccountsPageClient } from './accounts-page-client'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const supabase = createServiceClient()
  const { data: accounts } = await (supabase as any)
    .from('accounts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return <AccountsPageClient initialAccounts={accounts ?? []} />
}
