'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  Activity,
  FileText,
  HelpCircle,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuperAdminSidebarProps {
  collapsed: boolean
  onToggle: (val: boolean) => void
  adminEmail: string | null
  onMobileClose?: () => void
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Companies',
    items: [
      { href: '/super-admin/companies', label: 'Companies', icon: Building2, exact: false },
      { href: '/super-admin/onboard-company', label: 'Onboard Company', icon: UserPlus, exact: false },
      { href: '/super-admin/demo-requests', label: 'Demo Requests', icon: Sparkles, exact: false },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/super-admin/monitoring', label: 'Monitoring', icon: Activity, exact: false },
      { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText, exact: false },
      { href: '/super-admin/support', label: 'Support', icon: HelpCircle, exact: false },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3, exact: false },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/super-admin/billing', label: 'Billing', icon: CreditCard, exact: false },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/super-admin/settings', label: 'Settings', icon: Settings, exact: false },
    ],
  },
]

export function SuperAdminSidebar({
  collapsed,
  onToggle,
  adminEmail,
  onMobileClose,
}: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      // Server-side signout — clears the SSR session cookie so the proxy
      // won't redirect back to /super-admin after logout.
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // ignore — still redirect
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <aside
      className={cn(
        'h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 transition-all duration-200',
        collapsed ? 'w-14' : 'w-[220px]'
      )}
    >
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <img
            src="/Klinqcrm-logo.png"
            alt="Klinq Logo"
            className="h-10 w-auto object-contain shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0 leading-none">
              <span className="text-zinc-100 text-xs font-semibold tracking-tight block truncate">
                Control Center
              </span>
              <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase block mt-0.5">
                Platform Admin
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => onToggle(!collapsed)}
          className="hidden lg:flex p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 rounded transition-all cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold px-2 mb-1 select-none">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                  className={cn(
                    'flex items-center rounded text-xs transition-all duration-100',
                    collapsed ? 'justify-center w-10 h-8 mx-auto' : 'gap-2.5 px-2 h-7',
                    active
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
                  )}
                >
                  <item.icon
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-zinc-200' : 'text-zinc-500'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-2 space-y-1 shrink-0">
        {adminEmail && !collapsed && (
          <div className="px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 min-w-0 mb-1">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider select-none">
              Signed in as
            </p>
            <p className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">{adminEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'w-full flex items-center text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 rounded transition-all cursor-pointer disabled:opacity-40',
            collapsed ? 'justify-center w-10 h-8 mx-auto' : 'gap-2.5 px-2 h-7'
          )}
        >
          {signingOut ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : (
            <LogOut className="size-4 shrink-0" />
          )}
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
