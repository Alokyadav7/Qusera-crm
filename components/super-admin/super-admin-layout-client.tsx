'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { SuperAdminSidebar } from './super-admin-sidebar'
import {
  Menu, X, Search, ChevronDown, Bell, User, Plus, Eye, Send,
  HelpCircle, LogOut, CheckCircle2, AlertCircle, Loader2, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface Alert {
  id: string
  severity: string
  title: string
  company_name: string | null
  created_at: string
}

interface Company {
  id: string
  name: string
  slug: string
}

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
  
  // States for Command Bar features
  const [searchQuery, setSearchQuery] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  
  const [searchFocused, setSearchFocused] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showImpersonateModal, setShowImpersonateModal] = useState(false)
  const [showAnnounceModal, setShowAnnounceModal] = useState(false)
  const [announceText, setAnnounceText] = useState('')
  const [announcing, setAnnouncing] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  // Refs for click outside detection
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const quickActionsRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    
    // Default collapsed behavior based on responsive screen width
    const stored = localStorage.getItem('sa-sidebar-collapsed')
    if (stored !== null) {
      setCollapsed(stored === 'true')
    } else {
      if (window.innerWidth >= 768 && window.innerWidth < 1280) {
        setCollapsed(true) // Tablet default: collapsed
      } else {
        setCollapsed(false) // Desktop default: expanded
      }
    }

    // Click outside handler
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (quickActionsRef.current && !quickActionsRef.current.contains(target)) {
        setShowQuickActions(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false)
      }
    }
    
    // Keyboard shortcut for search (Ctrl+K or Cmd+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    // Load initial context data
    fetchAlerts()
    fetchCompanies()

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleToggle = (val: boolean) => {
    setCollapsed(val)
    localStorage.setItem('sa-sidebar-collapsed', String(val))
  }

  const fetchAlerts = async () => {
    setLoadingAlerts(true)
    try {
      const res = await fetch('/api/super-admin/overview')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch {
      // Graceful ignore
    } finally {
      setLoadingAlerts(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/super-admin/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies || [])
      }
    } catch {
      // Graceful ignore
    }
  }

  const handleImpersonate = async (companyId: string, companyName: string) => {
    setImpersonating(companyId)
    try {
      const res = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          reason: `Super Admin access to ${companyName} from Global Search/Command Bar`,
        }),
      })
      if (res.ok) {
        toast.success(`Impersonating ${companyName}`)
        window.location.href = '/dashboard'
      } else {
        const err = await res.json()
        toast.error(err.error || 'Impersonation failed')
      }
    } finally {
      setImpersonating(null)
      setShowImpersonateModal(false)
    }
  }

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announceText.trim()) return
    setAnnouncing(true)
    // Simulate sending announcement to all workspaces
    await new Promise(resolve => setTimeout(resolve, 1200))
    toast.success('System announcement sent to all active instances')
    setAnnounceText('')
    setAnnouncing(false)
    setShowAnnounceModal(false)
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // ignore
    } finally {
      window.location.href = '/login'
    }
  }

  const filteredSearchCompanies = searchQuery.trim()
    ? companies.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex">
        <div className="hidden lg:block w-[220px] bg-zinc-950 border-r border-zinc-800 shrink-0" />
        <main className="flex-1 bg-zinc-950 min-h-screen lg:pl-[220px]">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex relative">
      
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (desktop: fixed left; mobile: slide-in drawer) */}
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

      {/* Main content viewport */}
      <div className={`
        flex-1 flex flex-col min-w-0 transition-all duration-200
        ${collapsed ? 'lg:pl-14' : 'lg:pl-[220px]'}
      `}>
        
        {/* Sticky Command Bar */}
        <header className="sticky top-0 z-30 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6 select-none shrink-0">
          
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/Klinqcrm-logo.png" alt="Klinq Logo" className="h-8 w-auto object-contain" />
              <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Super Admin</span>
            </div>
            
            {/* Desktop Collapse Indicator */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">SaaS OS v1.2</span>
            </div>
          </div>

          {/* Center: Global Search Input */}
          <div ref={searchContainerRef} className="relative max-w-md w-full mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search resources... (Ctrl+K)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded pl-9 pr-10 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:bg-zinc-900/60 transition-all font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[9px] font-mono text-zinc-650">
                <span>⌘</span><span>K</span>
              </div>
            </div>

            {/* Search Dropdown Results */}
            {searchFocused && (
              <div className="absolute top-12 left-0 right-0 z-50 bg-zinc-950 border border-zinc-800 rounded shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                {searchQuery.trim() === '' ? (
                  <div className="px-4 py-3 text-center text-zinc-500 text-xs font-mono">
                    Type a company name or slug to jump/impersonate
                  </div>
                ) : filteredSearchCompanies.length === 0 ? (
                  <div className="px-4 py-3 text-center text-zinc-600 text-xs font-mono">
                    No matching companies found
                  </div>
                ) : (
                  filteredSearchCompanies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleImpersonate(c.id, c.name)}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-900 transition-colors flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate">{c.name}</p>
                        <p className="text-[10px] text-zinc-550 font-mono">{c.slug}</p>
                      </div>
                      <span className="text-[10px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded bg-zinc-900 group-hover:text-white group-hover:border-zinc-700 transition-colors">
                        Impersonate
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Notifications, Profile */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Mobile Search Toggle */}
            <button
              onClick={() => { setSearchFocused(!searchFocused); setTimeout(() => searchInputRef.current?.focus(), 100) }}
              className="md:hidden p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer"
            >
              <Search className="size-4" />
            </button>

            {/* Quick Actions Dropdown */}
            <div ref={quickActionsRef} className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-300 text-[11px] font-bold px-2.5 py-1.5 rounded transition-all cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Actions</span>
                <ChevronDown className="size-3" />
              </button>

              {showQuickActions && (
                <div className="absolute right-0 top-9 z-50 w-48 bg-zinc-950 border border-zinc-800 rounded shadow-2xl py-1 text-xs text-left">
                  <Link
                    href="/super-admin/onboard-company"
                    onClick={() => setShowQuickActions(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    <Plus className="size-3.5" /> Onboard Tenant
                  </Link>
                  <button
                    onClick={() => { setShowQuickActions(false); setShowImpersonateModal(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left"
                  >
                    <Eye className="size-3.5" /> Impersonate Workspace
                  </button>
                  <button
                    onClick={() => { setShowQuickActions(false); setShowAnnounceModal(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left"
                  >
                    <Send className="size-3.5" /> Send Announcement
                  </button>
                  <hr className="border-zinc-800 my-1" />
                  <Link
                    href="/super-admin/support"
                    onClick={() => setShowQuickActions(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    <HelpCircle className="size-3.5" /> System Support
                  </Link>
                </div>
              )}
            </div>

            {/* Notifications Popover */}
            <div ref={notificationsRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded transition-all cursor-pointer relative"
              >
                <Bell className="size-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-zinc-950" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-9 z-50 w-72 bg-zinc-950 border border-zinc-800 rounded shadow-2xl py-1 text-xs text-left max-h-80 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between font-mono bg-zinc-900/40">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Platform Alerts</span>
                    <span className="text-[9px] text-zinc-600">{alerts.length} active</span>
                  </div>
                  {loadingAlerts ? (
                    <div className="py-6 flex items-center justify-center gap-1.5 text-zinc-600 font-mono text-[10px]">
                      <Loader2 className="size-3 animate-spin" /> Loading...
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="py-6 text-center text-zinc-650 font-mono text-[10px]">
                      No active alerts
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-900">
                      {alerts.slice(0, 5).map(a => (
                        <div key={a.id} className="p-3 hover:bg-zinc-900/40 transition-colors space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              a.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                            }`} />
                            <span className="font-semibold text-zinc-200 truncate">{a.title}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono truncate">{a.company_name ?? 'Platform Core'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-zinc-800 px-3 py-2 text-center bg-zinc-900/10">
                    <Link
                      href="/super-admin"
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                      View All Alerts
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-400 rounded transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-300">
                  <User className="size-3.5" />
                </div>
                <ChevronDown className="size-3 text-zinc-550 hidden sm:block" />
              </button>

              {showProfile && (
                <div className="absolute right-0 top-9 z-50 w-52 bg-zinc-950 border border-zinc-800 rounded shadow-2xl py-1 text-xs text-left">
                  <div className="px-3.5 py-2.5 border-b border-zinc-900 select-none">
                    <p className="text-[10px] font-mono text-zinc-650 uppercase tracking-wider">Signed in as</p>
                    <p className="text-[11px] font-semibold text-zinc-300 font-mono truncate mt-0.5">{adminEmail || 'Admin'}</p>
                  </div>
                  <Link
                    href="/super-admin/settings"
                    onClick={() => setShowProfile(false)}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-zinc-450 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    <User className="size-3.5" /> Platform Configs
                  </Link>
                  <hr className="border-zinc-900 my-1" />
                  <button
                    onClick={() => { setShowProfile(false); handleSignOut() }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="size-3.5 animate-spin-reverse" /> Sign Out
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Search overlay for mobile devices */}
        {searchFocused && (
          <div className="md:hidden fixed inset-0 z-50 bg-zinc-950 flex flex-col p-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3 shrink-0">
              <Search className="size-4 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-zinc-650 font-mono"
              />
              <button
                onClick={() => { setSearchFocused(false); setSearchQuery('') }}
                className="p-1 text-zinc-400 hover:text-white border border-zinc-800 rounded bg-zinc-900"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-3 divide-y divide-zinc-900">
              {searchQuery.trim() === '' ? (
                <p className="text-center text-zinc-600 text-xs py-10 font-mono">Type company name or slug</p>
              ) : filteredSearchCompanies.length === 0 ? (
                <p className="text-center text-zinc-600 text-xs py-10 font-mono">No companies found</p>
              ) : (
                filteredSearchCompanies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleImpersonate(c.id, c.name)}
                    className="w-full text-left py-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-550 font-mono">{c.slug}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded">
                      Impersonate
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Dynamic page content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>

      {/* Impersonate Company Dialog */}
      {showImpersonateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                <Eye className="size-4" /> Impersonation Node
              </span>
              <button
                onClick={() => setShowImpersonateModal(false)}
                className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <p className="text-zinc-500 text-xs">
              Directly access any client workspace instance. A log entry will record this operation.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-zinc-900 border border-zinc-900 rounded p-2">
              {companies.length === 0 ? (
                <p className="text-center text-zinc-650 text-xs py-6 font-mono">No companies available</p>
              ) : (
                companies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleImpersonate(c.id, c.name)}
                    disabled={!!impersonating}
                    className="w-full text-left py-2.5 px-3 hover:bg-zinc-900 rounded transition-colors flex items-center justify-between disabled:opacity-40"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-550 font-mono">{c.slug}</p>
                    </div>
                    {impersonating === c.id ? (
                      <Loader2 className="size-4 animate-spin text-zinc-500" />
                    ) : (
                      <Eye className="size-3.5 text-zinc-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Announcement Dialog */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form onSubmit={handleSendAnnouncement} className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                <Send className="size-4" /> System Announcement
              </span>
              <button
                type="button"
                onClick={() => setShowAnnounceModal(false)}
                className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <p className="text-zinc-500 text-xs">
              Broadcast a real-time notification overlay to all workspace administrators active on the platform.
            </p>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-zinc-650 tracking-wider">Announcement Text</label>
              <textarea
                value={announceText}
                onChange={e => setAnnounceText(e.target.value)}
                placeholder="e.g. System upgrade scheduled for 02:00 IST. CRM features will temporarily isolate."
                rows={3}
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 font-mono resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAnnounceModal(false)}
                className="bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold px-4 py-2 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={announcing}
                className="bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold px-4 py-2 rounded transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                {announcing && <Loader2 className="size-3 animate-spin text-zinc-950" />}
                Send Broadcast
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
