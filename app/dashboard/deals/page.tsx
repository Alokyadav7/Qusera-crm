export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { DealsPageClient } from './deals-page-client'

export default async function DealsPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()

  // Fetch company membership details
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const companyId = member?.company_id ?? null
  const role = member?.role ?? null

  if (!companyId) {
    return <DealsPageClient initialDeals={[]} userRole="viewer" currentUserId={user.id} companyId="" />
  }

  // Query deals scoped by company
  let query = svc
    .from('deals')
    .select('*, contact:contacts(full_name, email)')
    .eq('company_id', companyId)
    .is('deleted_at', null)

  // Gating check: if not owner, admin, or manager, restrict to user
  const isManagerOrAdmin = role && ['owner', 'admin', 'manager'].includes(role)
  if (!isManagerOrAdmin) {
    // Show deals where assigned_to is current user or created_by is current user
    query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
  }

  const { data: deals } = await query.order('created_at', { ascending: false })

  return (
    <DealsPageClient
      initialDeals={deals ?? []}
      userRole={role ?? 'viewer'}
      currentUserId={user.id}
      companyId={companyId}
    />
  )
}
