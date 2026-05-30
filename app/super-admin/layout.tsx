import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SuperAdminLayoutClient } from '@/components/super-admin/super-admin-layout-client'

export const metadata = {
  title: 'Platform Admin — CRM',
  description: 'Super admin control center for CRM platform',
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check platform_admins table OR user metadata flag
  const svc = createServiceClient()
  const { data: adminRecord } = await svc
    .from('platform_admins')
    .select('is_active')
    .eq('user_id', user.id)
    .maybeSingle()

  const metaFlag = user.user_metadata?.is_platform_admin === true

  if (!adminRecord?.is_active && !metaFlag) {
    redirect('/dashboard')
  }

  return (
    <SuperAdminLayoutClient adminEmail={user.email ?? null}>
      {children}
    </SuperAdminLayoutClient>
  )
}
