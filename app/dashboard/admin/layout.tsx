'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    async function checkAdminAccess() {
      const supabase = createClient()

      // Dev bypass
      if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
        setAllowed(true)
        setChecking(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecking(false); return }

      // Check if user has admin or super_admin role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', user.id)

      const roleNames = (userRoles ?? [])
        .map((ur: any) => ur.role?.name)
        .filter(Boolean)

      const isAdmin = roleNames.some((r: string) =>
        ['super_admin', 'admin'].includes(r)
      )
      setAllowed(isAdmin)
      setChecking(false)
    }

    checkAdminAccess()
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Checking permissions…</p>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <div className="size-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <ShieldAlert className="size-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold">Access Restricted</h1>
          <p className="text-muted-foreground text-sm">
            You need <strong>Admin</strong> or <strong>Super Admin</strong> role to access
            this panel. Contact your administrator to request access.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">← Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
