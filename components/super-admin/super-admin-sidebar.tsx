'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Building2, CreditCard, BarChart3,
  ChevronRight, Shield, LogOut, UserPlus, FileText, Settings, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  {
    label: 'Platform',
    items: [
      { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/super-admin/companies', label: 'Companies', icon: Building2 },
      { href: '/super-admin/onboard-company', label: 'Onboard Company', icon: UserPlus },
    ]
  },
  {
    label: 'Monitoring',
    items: [
      { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText },
    ]
  },
  {
    label: 'Finance',
    items: [
      { href: '/super-admin/billing', label: 'Billing', icon: CreditCard },
    ]
  },
  {
    label: 'Configuration',
    items: [
      { href: '/super-admin/settings', label: 'Platform Settings', icon: Settings },
    ]
  },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      // Sign out on the Supabase client to clear local token storage
      await createClient().auth.signOut()
    } catch {
      // ignore — still redirect
    }
    // Hard full-page redirect — this busts Next.js router cache AND
    // lets the server middleware see a cleared cookie and redirect to /login
    window.location.replace('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-950/70 backdrop-blur-xl border-r border-zinc-900/60 flex flex-col z-40 shadow-xl shadow-black/30">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-900/60 relative overflow-hidden">
        <div className="size-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg shadow-black/40 border border-white/20 relative overflow-hidden">
          <Shield className="size-[18px] text-zinc-950 z-10" />
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-black tracking-tight">Klinq CRM</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
            <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase">Platform Node</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
        {NAV_ITEMS.map(group => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-zinc-600 text-[9px] font-black tracking-[0.25em] uppercase px-3">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map(item => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all relative group/item',
                        active
                          ? 'bg-white/[0.04] text-white border border-white/[0.08] shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] border border-transparent'
                      )}
                    >
                      {active && (
                        <span className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r bg-violet-500" />
                      )}
                      <item.icon className={cn(
                        'size-4 shrink-0 transition-colors',
                        active ? 'text-violet-400' : 'text-zinc-400 group-hover/item:text-zinc-200'
                      )} />
                      <span>{item.label}</span>
                      {active && (
                        <ChevronRight className="size-3.5 ml-auto text-zinc-500" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Footer Panel */}
      <div className="p-4 border-t border-zinc-900/60 space-y-3">
        {/* Logged-in user info */}
        {userEmail && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/60">
            <div className="size-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Shield className="size-3.5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Signed in as</p>
              <p className="text-[11px] font-bold text-zinc-300 truncate">{userEmail}</p>
            </div>
          </div>
        )}

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/[0.06] hover:bg-red-500/[0.12] text-red-400 hover:text-red-300 text-xs font-bold rounded-xl border border-red-500/20 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
          id="super-admin-signout-btn"
        >
          {signingOut ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <LogOut className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          )}
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}
