'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, TrendingUp, Shield, CheckCircle, XCircle,
  UserPlus, FileText, Settings, CreditCard, BarChart3, Activity,
  ArrowRight, Calendar, Terminal
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Company {
  id: string
  name: string
  logo_url: string | null
  status: string | null
  created_at: string
  setup_complete: boolean | null
  plan_id: string | null
}

interface Stats {
  totalCompanies: number
  totalUsers: number
  totalLeads: number
  newThisMonth: number
  actionsThisMonth: number
}

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
  trial:     'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
  canceled:  'bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase',
}

export function SuperAdminOverviewClient({
  adminName,
  stats,
  recentCompanies,
}: {
  adminName: string
  stats: Stats
  recentCompanies: Company[]
}) {
  const quickLinks = [
    { href: '/super-admin/companies', label: 'All Companies', icon: Building2, desc: 'Manage instances, active slots & domains' },
    { href: '/super-admin/onboard-company', label: 'Onboard Company', icon: UserPlus, desc: 'Provision a new customer instance' },
    { href: '/super-admin/analytics', label: 'Platform Analytics', icon: BarChart3, desc: 'View global activity logs & usage metrics' },
    { href: '/super-admin/audit-logs', label: 'Audit Trail Logs', icon: FileText, desc: 'Trace system actions & configuration edits' },
    { href: '/super-admin/billing', label: 'Finance & Invoices', icon: CreditCard, desc: 'Track subscriptions, tier fees & payments' },
    { href: '/super-admin/settings', label: 'Settings Control', icon: Settings, desc: 'Alter thresholds, defaults & configurations' },
  ]

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[1500px] relative overflow-hidden">
      {/* Decorative ambient backgrounds */}
      <div className="absolute right-[5%] top-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute left-[20%] bottom-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            <Shield className="size-3 text-violet-400 animate-pulse" />
            <span>Root Admin Console</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight font-display">
            Platform Overview
          </h1>
          <p className="text-zinc-500 text-xs mt-1 font-sans">
            Terminal authenticated for <span className="font-semibold text-zinc-300">{adminName}</span> · Active credentials verified
          </p>
        </div>
        <Link
          href="/super-admin/onboard-company"
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-black/10 cursor-pointer"
        >
          <UserPlus className="size-3.5" />
          Onboard Company
        </Link>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
        {[
          { label: 'Total Companies', value: stats.totalCompanies, icon: Building2, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', sub: `+${stats.newThisMonth} new this month` },
          { label: 'Active Members', value: stats.totalUsers, icon: Users, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', sub: 'Across active tenants' },
          { label: 'Leads Processed', value: stats.totalLeads, icon: TrendingUp, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', sub: 'Total database count' },
          { label: 'New Cohorts', value: stats.newThisMonth, icon: Activity, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', sub: 'Current cycle onboarding' },
          { label: 'Audit Actions', value: stats.actionsThisMonth, icon: Terminal, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', sub: 'Logged system events' },
        ].map(k => (
          <div key={k.label} className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/80 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 text-xs font-semibold tracking-wide">{k.label}</span>
              <div className={`p-2 rounded-xl border ${k.color}`}>
                <k.icon className="size-4" />
              </div>
            </div>
            <p className="text-white text-3xl font-black tabular-nums tracking-tight font-display">{k.value.toLocaleString()}</p>
            <p className="text-zinc-500 text-[10px] font-mono tracking-tight mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Section Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-white text-sm font-bold tracking-tight font-display">Recent Onboarding Activity</p>
              </div>
              <Link href="/super-admin/companies" className="text-zinc-500 hover:text-white text-xs font-semibold transition-all flex items-center gap-1">
                View All <ArrowRight className="size-3" />
              </Link>
            </div>
            
            {recentCompanies.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 text-sm font-light">
                <Building2 className="size-10 mx-auto mb-3 text-zinc-600 opacity-60" />
                No companies currently onboarded onto the node.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {recentCompanies.map(co => (
                  <div key={co.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.01] transition-colors group">
                    <div className="size-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
                      {co.logo_url ? (
                        <img src={co.logo_url} alt="" className="size-7 rounded object-cover" />
                      ) : (
                        <Building2 className="size-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-sm font-bold truncate group-hover:text-white transition-colors">{co.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-zinc-500 text-[10px] font-mono">
                        <Calendar className="size-3" />
                        <span>
                          {formatDistanceToNow(new Date(co.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Setup status pill */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                        co.setup_complete 
                          ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                          : 'bg-amber-500/5 text-amber-400 border-amber-500/10'
                      }`}>
                        {co.setup_complete ? 'Setup Complete' : 'In Wizard'}
                      </span>
                      <span className={STATUS_STYLE[co.status ?? 'trial'] ?? STATUS_STYLE.trial}>
                        {co.status ?? 'trial'}
                      </span>
                      <Link
                        href={`/super-admin/companies/${co.id}`}
                        className="text-zinc-500 hover:text-white hover:bg-zinc-800/60 text-xs px-2.5 py-1.5 rounded-lg border border-transparent hover:border-zinc-700/60 transition-all font-semibold"
                      >
                        Configure →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-zinc-800/40 bg-zinc-950/10 text-center text-xs text-zinc-500">
            Node status operational · Isolated boundaries enforced
          </div>
        </div>

        {/* Quick Access Card */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/20">
            <p className="text-white text-sm font-bold tracking-tight font-display">System Quick Access</p>
          </div>
          <div className="p-4 space-y-2">
            {quickLinks.map(ql => (
              <Link
                key={ql.href}
                href={ql.href}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl hover:bg-white/[0.02] border border-transparent hover:border-zinc-800/60 transition-all group cursor-pointer"
              >
                <div className="size-9 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center shrink-0 shadow-md shadow-black/10 group-hover:bg-zinc-900 group-hover:border-zinc-700 transition-all">
                  <ql.icon className="size-4.5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-zinc-200 text-xs font-bold group-hover:text-white transition-colors">{ql.label}</p>
                  <p className="text-zinc-500 text-[10px] mt-0.5 leading-relaxed font-sans font-light">{ql.desc}</p>
                </div>
                <ArrowRight className="size-3.5 text-zinc-600 ml-auto group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
