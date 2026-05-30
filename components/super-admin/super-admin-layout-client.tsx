'use client'

import React, { useState, useEffect } from 'react'
import { SuperAdminSidebar } from './super-admin-sidebar'

export function SuperAdminLayoutClient({
  children,
  adminEmail,
}: {
  children: React.ReactNode
  adminEmail: string | null
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('sa-sidebar-collapsed')
    if (stored === 'true') {
      setCollapsed(true)
    }
  }, [])

  const handleToggle = (val: boolean) => {
    setCollapsed(val)
    localStorage.setItem('sa-sidebar-collapsed', String(val))
  }

  // Prevent flash of layout shifts
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 font-sans flex">
        <div className="w-64 bg-zinc-950 border-r border-zinc-800 shrink-0" />
        <main className="flex-1 pl-64 bg-black min-h-screen">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex relative">
      <SuperAdminSidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        adminEmail={adminEmail}
      />
      <main className={`flex-1 bg-black min-h-screen transition-all duration-200 ${collapsed ? 'pl-16' : 'pl-64'}`}>
        {children}
      </main>
    </div>
  )
}
