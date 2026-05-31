'use client'

import React, { useState, useEffect } from 'react'
import { SuperAdminSidebar } from './super-admin-sidebar'
import { Menu, X } from 'lucide-react'

export function SuperAdminLayoutClient({
  children,
  adminEmail,
}: {
  children: React.ReactNode
  adminEmail: string | null
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('sa-sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const handleToggle = (val: boolean) => {
    setCollapsed(val)
    localStorage.setItem('sa-sidebar-collapsed', String(val))
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 font-sans flex">
        <div className="hidden lg:block w-64 bg-zinc-950 border-r border-zinc-800 shrink-0" />
        <main className="flex-1 bg-black min-h-screen lg:pl-64">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex relative">

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <img src="/Klinqcrm-logo.png" alt="Klinq" className="h-8 w-auto object-contain" />
          <span className="text-zinc-200 text-xs font-bold tracking-tight">Klinq Ops</span>
        </div>
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="p-2 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* ── Mobile overlay backdrop ────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop: fixed left; mobile: slide-in drawer) ──── */}
      <div className={`
        fixed left-0 top-0 z-40 h-screen transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <SuperAdminSidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          adminEmail={adminEmail}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main
        className={`
          flex-1 bg-black min-h-screen
          pt-14 lg:pt-0
          transition-all duration-200
          ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}
        `}
      >
        {children}
      </main>
    </div>
  )
}
