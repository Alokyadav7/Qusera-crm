export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ApiKeysPageClient } from './api-keys-client'

export default async function ApiKeysPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = createServiceClient() // Service role for data queries

  const { data: uac } = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user.id).single()
  const companyId = (uac as any)?.company_id

  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-muted-foreground">Please complete onboarding to access API integrations.</p>
      </div>
    )
  }

  const [
    { data: sub },
    { data: apiKeys },
    { data: webhooks },
  ] = await Promise.all([
    supabase.from('subscriptions' as any).select('plan_id').eq('company_id', companyId).maybeSingle(),
    (supabase as any).from('api_keys').select('id, name, key_prefix, last_used_at, created_at, is_active').eq('company_id', companyId).order('created_at', { ascending: false }),
    (supabase as any).from('webhooks').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
  ])

  const isEnterprise = (sub as any)?.plan_id === 'enterprise'

  return (
    <ApiKeysPageClient 
      isEnterprise={isEnterprise} 
      initialKeys={apiKeys ?? []} 
      initialWebhooks={webhooks ?? []} 
    />
  )
}
