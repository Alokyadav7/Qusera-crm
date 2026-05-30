'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  Activity,
  FileText,
  HelpCircle,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SuperAdminSidebarProps {
  collapsed: boolean
  onToggle: (val: boolean) => void
  adminEmail: string | null
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true }
    ]
  },
  {
    label: 'Companies',
    items: [
      { href: '/super-admin/companies', label: 'Companies', icon: Building2, exact: false },
      { href: '/super-admin/onboard-company', label: 'Onboard Company', icon: Settings, exact: false }
    ]
  },
  {
    label: 'Operations',
    items: [
      { href: '/super-admin/monitoring', label: 'Monitoring', icon: Activity, exact: false },
      { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText, exact: false },
      { href: '/super-admin/support', label: 'Support Center', icon: HelpCircle, exact: false }
    ]
  },
  {
    label: 'Analytics',
    items: [
      { href: '/super-admin/analytics', label: 'Platform Analytics', icon: BarChart3, exact: false }
    ]
  },
  {
    label: 'Finance',
    items: [
      { href: '/super-admin/billing', label: 'Billing', icon: CreditCard, exact: false }
    ]
  },
  {
    label: 'Configuration',
    items: [
      { href: '/super-admin/settings', label: 'Platform Settings', icon: Settings, exact: false }
    ]
  }
]

export function SuperAdminSidebar({ collapsed, onToggle, adminEmail }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await createClient().auth.signOut()
    } catch {}
    window.location.replace('/login')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col z-40 transition-all duration-200 select-none shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-900">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img
            src="/Klinqcrm-logo.png"
            alt="Klinq Logo"
            className="h-9 w-auto object-contain shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 leading-none">
              <span className="text-zinc-200 text-xs font-bold tracking-tight block">Klinq Ops</span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase block mt-0.5">Control Node</span>
            </div>
          )}
        </div>
        <button
          onClick={() => onToggle(!collapsed)}
          className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded border border-transparent hover:border-zinc-800 transition-all cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="text-zinc-650 text-[9px] font-bold tracking-wider uppercase px-2 mb-1.5 select-none">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center rounded-md text-xs transition-all relative group/item py-1.5',
                        collapsed ? 'justify-center px-0' : 'px-2 gap-2.5',
                        active
                          ? 'bg-zinc-900 text-zinc-100 font-semibold border border-zinc-800'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'size-4 shrink-0 transition-colors',
                          active ? 'text-zinc-200' : 'text-zinc-550 group-hover/item:text-zinc-300'
                        )}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Profile & Signout */}
      <div className="p-3 border-t border-zinc-900 space-y-2">
        {adminEmail && !collapsed && (
          <div className="px-2.5 py-2 bg-zinc-900/30 rounded border border-zinc-900 min-w-0">
            <p className="text-[9px] font-mono text-zinc-550 uppercase block select-none">Signed in as</p>
            <p className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">{adminEmail}</p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className={cn(
            'w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 bg-zinc-900/10 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-[10px] font-bold py-2 rounded transition-all cursor-pointer disabled:opacity-50',
            collapsed ? 'px-0' : 'px-3 gap-2'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          {signingOut ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <LogOut className="size-3.5 shrink-0" />
          )}
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
