'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, CreditCard, BarChart3,
  ChevronRight, Shield, LogOut, UserPlus, FileText, Settings, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-950/70 backdrop-blur-xl border-r border-zinc-900/60 flex flex-col z-40 shadow-xl shadow-black/30">
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-900/60 relative overflow-hidden group">
        <div className="size-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg shadow-black/40 border border-white/20 relative overflow-hidden">
          <Shield className="size-4.5 text-zinc-950 z-10" />
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-black tracking-tight font-display">Klinq CRM</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
            <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase">Platform Node</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {NAV_ITEMS.map(group => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-zinc-600 dark:text-zinc-500 text-[9px] font-black tracking-[0.25em] uppercase px-3">
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
                      {/* Left active marker strip */}
                      {active && (
                        <span className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r bg-violet-500" />
                      )}
                      
                      <item.icon className={cn(
                        'size-4 shrink-0 transition-colors',
                        active ? 'text-violet-400' : 'text-zinc-400 group-hover/item:text-zinc-200'
                      )} />
                      
                      <span>{item.label}</span>
                      
                      {active && (
                        <ChevronRight className="size-3.5 ml-auto text-zinc-500 group-hover/item:translate-x-0.5 transition-transform" />
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
      <div className="p-4 border-t border-zinc-900/60 bg-zinc-950/40 relative">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer shadow-md shadow-black/20"
        >
          <LogOut className="size-3.5" />
          Terminate Session
        </button>
      </div>
    </aside>
  )
}
