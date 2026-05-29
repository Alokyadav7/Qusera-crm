'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldAlert, Loader2, Users, CreditCard, Settings, Building2, FileText, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard/admin', label: 'Overview', icon: Building2, exact: true },
  { href: '/dashboard/admin/team', label: 'Team', icon: Users },
  { href: '/dashboard/admin/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/admin/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/admin/audit-logs', label: 'Audit Logs', icon: FileText },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') { setAllowed(true); setChecking(false); return }
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setChecking(false); return }
      const { data } = await (createClient() as any).from('company_members').select('role').eq('user_id', user.id).eq('is_active', true).is('deleted_at', null).single()
      setAllowed(!!data && ['owner', 'admin', 'manager'].includes(data.role))
      setChecking(false)
    })
  }, [])

  if (checking) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>

  if (!allowed) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
        <ShieldAlert className="size-12 text-red-500" />
        <h1 className="text-xl font-bold">Access Restricted</h1>
        <p className="text-muted-foreground text-sm">You need Admin or Manager role to access this area.</p>
        <Button asChild variant="outline"><Link href="/dashboard">← Back to Dashboard</Link></Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="flex items-center px-6 overflow-x-auto">
          {NAV.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-sm border-b-2 transition-colors whitespace-nowrap',
                active ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
                <item.icon className="size-3.5" />{item.label}
              </Link>
            )
          })}
          <Link href="/dashboard" className="ml-auto text-xs text-muted-foreground hover:text-foreground px-3 py-3">← CRM</Link>
        </div>
      </div>
      {children}
    </div>
  )
}
