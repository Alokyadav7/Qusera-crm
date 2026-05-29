import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SuperAdminSidebar } from '@/components/super-admin/super-admin-sidebar'

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
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-white/10 selection:text-white">
      <SuperAdminSidebar />
      <main className="ml-64 min-h-screen relative z-10">
        {children}
      </main>
    </div>

  )
}
