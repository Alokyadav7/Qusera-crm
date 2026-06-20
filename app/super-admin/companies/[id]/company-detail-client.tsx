'use client'

import { useState } from 'react'
import {
  Building2, Users, TrendingUp, Shield, Activity, Calendar,
  Clock, Eye, Pause, Play, Trash2, Mail, CheckCircle2,
  Terminal, Search, Settings, AlertTriangle, AlertCircle, Sparkles, Database
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  status: string
  plan_id: string | null
  is_active: boolean
  created_at: string
  setup_complete: boolean
}

interface Member {
  user_id: string
  role: string
  joined_at: string
  is_active: boolean
  profile?: { full_name: string; email: string }
}

interface Subscription {
  id: string
  status: string
  mrr: number
  plan?: { display_name: string; price_monthly: number }
  current_period_end?: string
}

interface FeatureOverride {
  id: string
  feature_key: string
  is_enabled: boolean
}

interface ActivityEvent {
  event_type: string
  resource_label: string
  actor_type: string
  created_at: string
}

interface UsageMetric {
  metric_key: string
  total_quantity: number
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'billing', label: 'Billing' },
  { id: 'usage', label: 'Usage' },
  { id: 'features', label: 'Feature Flags' },
  { id: 'timeline', label: 'Activity Timeline' },
  { id: 'settings', label: 'Settings' },
]

export function CompanyDetailClient({
  company: initialCompany,
  members,
  leadCount,
  subscription,
  featureOverrides: initialOverrides,
  recentEvents,
  usageSummary,
}: {
  company: Company
  members: Member[]
  leadCount: number
  subscription: Subscription | null
  featureOverrides: FeatureOverride[]
  recentEvents: ActivityEvent[]
  usageSummary: UsageMetric[]
}) {
  const [company, setCompany] = useState<Company>(initialCompany)
  const [overrides, setOverrides] = useState<FeatureOverride[]>(initialOverrides)
  const [activeTab, setActiveTab] = useState('overview')
  const [acting, setActing] = useState(false)
  const [searchTimeline, setSearchTimeline] = useState('')

  // Calculate Health Score
  const getHealthScore = (): { label: 'Healthy' | 'Warning' | 'Critical'; cls: string } => {
    if (company.status === 'suspended') return { label: 'Critical', cls: 'text-red-400 border-red-500/20 bg-red-500/10' }
    if (!company.setup_complete) return { label: 'Warning', cls: 'text-amber-400 border-amber-500/20 bg-amber-500/10' }
    if (members.length === 0) return { label: 'Critical', cls: 'text-red-400 border-red-500/20 bg-red-500/10' }
    if (members.length === 1) return { label: 'Warning', cls: 'text-amber-400 border-amber-500/20 bg-amber-500/10' }
    return { label: 'Healthy', cls: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' }
  }

  const health = getHealthScore()

  // Actions
  async function handleAction(action: string) {
    setActing(true)
    try {
      if (action === 'impersonate') {
        const res = await fetch('/api/super-admin/impersonate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: company.id,
            reason: `Super Admin access to ${company.name} from Company Detail settings`,
          }),
        })
        if (res.ok) {
          toast.success(`Impersonating ${company.name}`)
          window.location.href = '/dashboard'
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to impersonate')
        }
        return
      }

      const res = await fetch(`/api/super-admin/companies/${company.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        toast.success(`Action successfully executed`)
        // Refresh local status
        if (action === 'suspend') setCompany(c => ({ ...c, status: 'suspended', is_active: false }))
        if (action === 'activate') setCompany(c => ({ ...c, status: 'active', is_active: true }))
      } else {
        const err = await res.json()
        toast.error(err.error || 'Action failed')
      }
    } finally {
      setActing(false)
    }
  }

  async function toggleOverride(key: string, currentVal: boolean) {
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}/feature-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_key: key, is_enabled: !currentVal }),
      })
      if (res.ok) {
        toast.success(`Override saved`)
        setOverrides(prev =>
          prev.map(o => (o.feature_key === key ? { ...o, is_enabled: !currentVal } : o))
        )
      } else {
        toast.error('Failed to save feature override')
      }
    } catch {
      toast.error('Unexpected error')
    }
  }

  // Filter chronological activity timeline
  const filteredEvents = recentEvents.filter(e =>
    !searchTimeline ||
    e.event_type.toLowerCase().includes(searchTimeline.toLowerCase()) ||
    (e.resource_label ?? '').toLowerCase().includes(searchTimeline.toLowerCase())
  )

  // Map metrics keys
  const getMetricQuantity = (key: string) => {
    return usageSummary.find(u => u.metric_key === key)?.total_quantity ?? 0
  }

  const inputCls = "w-full bg-zinc-950 border border-zinc-900 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
  const labelCls = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5"

  return (
    <div className="p-6 xl:p-10 space-y-6 max-w-[1600px] bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono select-none">
            <Link href="/super-admin/companies" className="hover:text-zinc-300">Companies</Link>
            <span>/</span>
            <span className="text-zinc-350">{company.slug}</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1.5 tracking-tight font-display">{company.name}</h1>
          <p className="text-zinc-500 text-xs font-mono mt-0.5">ID: {company.id}</p>
        </div>

        {/* Impersonate Owner Button */}
        <button
          onClick={() => handleAction('impersonate')}
          disabled={acting}
          className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-3.5 py-2 rounded transition-all cursor-pointer disabled:opacity-50"
        >
          <Eye className="size-3.5" />
          Impersonate Admin
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Operational Column Summary Card */}
        <div className="lg:col-span-1 bg-zinc-950 border border-zinc-900 rounded p-5 space-y-5">
          <p className="text-zinc-550 text-[10px] font-bold uppercase tracking-wider select-none">Operational Summary</p>

          <div className="space-y-4 pb-4 border-b border-zinc-900">
            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wide">Workspace Health</span>
              <div className="mt-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${health.cls}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {health.label}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wide">Deployment Date</span>
              <p className="text-zinc-300 text-xs font-mono mt-0.5">{format(new Date(company.created_at), 'dd MMM yyyy, HH:mm')}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wide">Wizard Setup</span>
              <p className="text-zinc-300 text-xs font-bold uppercase mt-0.5">
                {company.setup_complete ? 'Completed' : 'Pending Wizard'}
              </p>
            </div>
          </div>

          {/* Quick Core Operations Toggles */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wide block mb-1">State Override Tools</span>
            {company.status !== 'suspended' ? (
              <button
                onClick={() => handleAction('suspend')}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/40 hover:border-red-800 text-[11px] font-bold py-2 rounded transition-all cursor-pointer disabled:opacity-50"
              >
                <Pause className="size-3.5" /> Suspend Workspace
              </button>
            ) : (
              <button
                onClick={() => handleAction('activate')}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 hover:border-emerald-800 text-[11px] font-bold py-2 rounded transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="size-3.5" /> Activate Workspace
              </button>
            )}
            
            <button
              onClick={() => {
                if (confirm(`Trigger soft deletion queue for ${company.name}?`)) {
                  handleAction('delete')
                }
              }}
              disabled={acting}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900/35 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-zinc-900 hover:border-rose-900/50 text-[11px] font-bold py-2 rounded transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="size-3.5" /> Soft-Delete Tenant
            </button>
          </div>
        </div>

        {/* Right Content Tabbed Space */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Horizontal Tab Navigation */}
          <div className="flex border-b border-zinc-900 overflow-x-auto scrollbar-none pb-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Panes */}
          <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
            
            {/* 1. Overview Pane */}
            {activeTab === 'overview' && (
              <div className="p-6 space-y-6">
                <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider border-b border-zinc-900 pb-3">Active Operational Indices</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Leads Processed', value: leadCount },
                    { label: 'Registered Members', value: members.length },
                    { label: 'Active Subscription', value: subscription?.plan?.display_name ?? 'Free Tier' },
                    { label: 'Billing Rate (Monthly)', value: subscription?.mrr ? `₹${subscription.mrr.toLocaleString('en-IN')}` : '₹0' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-zinc-900/30 border border-zinc-900 p-4 rounded">
                      <span className="text-zinc-550 text-[9px] font-bold uppercase block">{stat.label}</span>
                      <span className="text-white text-base font-bold font-mono block mt-1.5">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Users Pane */}
            {activeTab === 'users' && (
              <div className="p-0">
                <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-900/10 flex items-center justify-between">
                  <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Tenant Team Directory</p>
                  <span className="text-[10px] font-mono text-zinc-500">{members.length} team members</span>
                </div>
                {members.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">No users registered in this tenant boundary.</div>
                ) : (
                  <div className="divide-y divide-zinc-900">
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-900/10 transition-colors">
                        <div>
                          <p className="text-zinc-200 text-xs font-bold">{m.profile?.full_name || 'Anonymous User'}</p>
                          <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{m.profile?.email || '—'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded">
                            {m.role}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${
                            m.is_active 
                              ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                              : 'text-zinc-500 border-zinc-800 bg-zinc-900'
                          }`}>
                            {m.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Billing Pane */}
            {activeTab === 'billing' && (
              <div className="p-6 space-y-5">
                <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider border-b border-zinc-900 pb-3">Subscription Rate Ledger</p>
                
                <div className="bg-zinc-900/30 border border-zinc-900 rounded p-4.5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-zinc-500 text-[9px] font-bold uppercase">Pricing Rate Plan</p>
                      <p className="text-white text-base font-bold uppercase mt-1">{subscription?.plan?.display_name ?? 'Standard Free Tier'}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                      {subscription?.status ?? 'active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-900 text-xs font-mono">
                    <div>
                      <span className="text-zinc-550 font-medium">Monthly Rate</span>
                      <p className="text-zinc-300 font-bold mt-0.5">₹{subscription?.mrr ? subscription.mrr.toLocaleString('en-IN') : 0} / month</p>
                    </div>
                    <div>
                      <span className="text-zinc-550 font-medium">Upcoming Renewal Date</span>
                      <p className="text-zinc-300 font-bold mt-0.5">
                        {subscription?.current_period_end ? format(new Date(subscription.current_period_end), 'dd MMM yyyy') : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Usage Pane */}
            {activeTab === 'usage' && (
              <div className="p-6 space-y-5">
                <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider border-b border-zinc-900 pb-3">Operational Usage Dashboard</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'API Queries Count', val: getMetricQuantity('api_calls'), limit: '10,000 / mo', icon: Database },
                    { label: 'AI Leads Token', val: getMetricQuantity('ai_tokens'), limit: '5,000 / mo', icon: Sparkles },
                    { label: 'SMS Dispatched', val: getMetricQuantity('sms_dispatched'), limit: '500 / mo', icon: Mail },
                    { label: 'WhatsApp Dispatched', val: getMetricQuantity('whatsapp_dispatched'), limit: '200 / mo', icon: Clock },
                    { label: 'Database Storage (MB)', val: 24.8, limit: '2,000 MB', icon: Database },
                    { label: 'Automations Triggers', val: getMetricQuantity('automation_triggers'), limit: '500 / mo', icon: Activity },
                  ].map(m => (
                    <div key={m.label} className="bg-zinc-900/30 border border-zinc-900 p-4 rounded flex items-start justify-between">
                      <div>
                        <span className="text-zinc-550 text-[9px] font-bold uppercase tracking-wide block">{m.label}</span>
                        <span className="text-white text-base font-bold font-mono block mt-1.5">{m.val}</span>
                        <span className="text-zinc-650 text-[9.5px] font-mono mt-1 block">Limit: {m.limit}</span>
                      </div>
                      <m.icon className="size-4 text-zinc-550 shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Feature Flags Pane */}
            {activeTab === 'features' && (
              <div className="p-0">
                <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-900/10">
                  <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Workspace Feature Flag Overrides</p>
                </div>
                
                <div className="divide-y divide-zinc-900">
                  {[
                    { key: 'voice', label: 'VoIP Interactive Telephony', desc: 'Allows direct call placement inside CRM pipelines.' },
                    { key: 'integrations', label: 'Third-party Integrations Portal', desc: 'Allows connecting and piping webhook notifications.' },
                    { key: 'sms', label: 'SMS Notifications Service', desc: 'Dispatches custom triggers and leads validation logs.' },
                    { key: 'whatsapp', label: 'WhatsApp Sequences Scheduler', desc: 'Permits scheduled cron delivery lists.' },
                  ].map(feat => {
                    const activeFlag = overrides.find(o => o.feature_key === feat.key)?.is_enabled ?? false
                    return (
                      <div key={feat.key} className="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-zinc-900/10 transition-colors">
                        <div>
                          <p className="text-zinc-200 text-xs font-bold">{feat.label}</p>
                          <p className="text-zinc-550 text-[10px] mt-0.5 font-sans leading-relaxed">{feat.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleOverride(feat.key, activeFlag)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10.5px] font-bold transition-all border cursor-pointer ${
                            activeFlag
                              ? 'bg-zinc-100 text-zinc-950 border-zinc-200'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          {activeFlag ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 6. Chronological activity timeline */}
            {activeTab === 'timeline' && (
              <div className="p-0">
                <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider">Chronological Activity Ledger</p>
                  
                  {/* Search Timeline Filter */}
                  <div className="relative group shrink-0 w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-550" />
                    <input
                      type="text"
                      placeholder="Search events ledger…"
                      value={searchTimeline}
                      onChange={e => setSearchTimeline(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded pl-7 pr-3 py-1 text-[11px] text-white focus:outline-none focus:border-zinc-800"
                    />
                  </div>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 text-xs font-mono select-none">No records match filter bounds.</div>
                ) : (
                  <div className="p-6 relative space-y-6">
                    {/* Vertical Connecting Line */}
                    <div className="absolute left-[33px] top-[28px] bottom-[30px] w-0.5 bg-zinc-900" />

                    {filteredEvents.map((evt, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        {/* Timeline Circle */}
                        <div className="size-4 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        </div>
                        <div>
                          <p className="text-zinc-200 text-xs font-bold font-mono tracking-tight">{evt.event_type.replace('.', ' · ')}</p>
                          {evt.resource_label && (
                            <p className="text-zinc-500 text-[10.5px] mt-0.5 font-mono">{evt.resource_label}</p>
                          )}
                          <div className="flex items-center gap-1.5 text-zinc-650 text-[10px] mt-1 font-mono">
                            <Clock className="size-3" />
                            <span>{format(new Date(evt.created_at), 'dd MMM yyyy, HH:mm')}</span>
                            <span>·</span>
                            <span className="uppercase font-bold text-[9px]">{evt.actor_type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. Settings Pane */}
            {activeTab === 'settings' && (
              <div className="p-6 space-y-5">
                <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider border-b border-zinc-900 pb-3">Corporate Domain Variables</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Company Slug Address</label>
                    <input
                      disabled
                      value={company.slug}
                      className={inputCls + " opacity-50 cursor-not-allowed"}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Corporate Legal Name</label>
                    <input
                      disabled
                      value={company.name}
                      className={inputCls + " opacity-50 cursor-not-allowed"}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  )
}
