'use client'

import { useState, useEffect } from 'react'
import {
  Save, Loader2, Globe, Mail, Shield, ToggleLeft, ToggleRight,
  Terminal, KeyRound, CheckCircle2, XCircle, Settings, Lock,
  CreditCard, Share2, ToggleLeft as ToggleLeftIcon, Activity, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'

interface PlatformSettings {
  platform_name: string
  platform_logo_url: string
  support_email: string
  default_sender_name: string
  default_sender_email: string
  daily_sms_limit: number
  daily_whatsapp_limit: number
  daily_email_limit: number
  maintenance_mode: boolean
}

interface MockSettings {
  google_auth: boolean
  force_mfa: boolean
  session_timeout: number
  razorpay_mode: 'test' | 'live'
  auto_invoice: boolean
  flag_ai_copilot: boolean
  flag_broadcasts: boolean
  flag_custom_roles: boolean
  flag_developer_api: boolean
}

const defaults: PlatformSettings = {
  platform_name: 'KlinqCRM',
  platform_logo_url: '',
  support_email: 'support@klinqcrm.in',
  default_sender_name: 'KlinqCRM',
  default_sender_email: 'noreply@klinqcrm.in',
  daily_sms_limit: 500,
  daily_whatsapp_limit: 200,
  daily_email_limit: 1000,
  maintenance_mode: false,
}

const mockDefaults: MockSettings = {
  google_auth: true,
  force_mfa: false,
  session_timeout: 60,
  razorpay_mode: 'test',
  auto_invoice: true,
  flag_ai_copilot: true,
  flag_broadcasts: false,
  flag_custom_roles: true,
  flag_developer_api: false,
}

const CATEGORIES = [
  { id: 'general', label: 'General branding', icon: Globe },
  { id: 'auth', label: 'Authentication controls', icon: KeyRound },
  { id: 'email', label: 'Email defaults', icon: Mail },
  { id: 'billing', label: 'Billing config', icon: CreditCard },
  { id: 'integrations', label: 'APIs & Limits', icon: Share2 },
  { id: 'flags', label: 'Feature flags', icon: ToggleLeftIcon },
  { id: 'security', label: 'Isolation & Security', icon: Shield },
  { id: 'secrets', label: 'Platform secrets', icon: Terminal },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaults)
  const [mockSettings, setMockSettings] = useState<MockSettings>(mockDefaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [envStatus, setEnvStatus] = useState<Record<string, boolean> | null>(null)
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<CategoryId>('general')
  const [showMobileNav, setShowMobileNav] = useState(false)

  useEffect(() => {
    // Load local storage mock configs
    const storedMock = localStorage.getItem('sa-settings-mock')
    if (storedMock) {
      try {
        setMockSettings({ ...mockDefaults, ...JSON.parse(storedMock) })
      } catch {
        // ignore
      }
    }

    Promise.all([
      fetch('/api/super-admin/settings').then(r => r.ok ? r.json() : null),
      fetch('/api/super-admin/env-status').then(r => r.ok ? r.json() : null),
    ]).then(([settingsData, envData]) => {
      if (settingsData?.settings) {
        const sanitized = Object.fromEntries(
          Object.entries(settingsData.settings).map(([k, v]) => [k, v ?? (defaults as any)[k] ?? ''])
        )
        setSettings({ ...defaults, ...sanitized })
      }
      if (envData?.env) setEnvStatus(envData.env)
    }).finally(() => setLoading(false))
  }, [])

  function set<K extends keyof PlatformSettings>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
      setSettings(s => ({ ...s, [key]: val }))
    }
  }

  function setMock<K extends keyof MockSettings>(key: K, val: any) {
    setMockSettings(s => {
      const updated = { ...s, [key]: val }
      localStorage.setItem('sa-settings-mock', JSON.stringify(updated))
      return updated
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    // Save backend values
    const res = await fetch('/api/super-admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    
    if (res.ok) {
      toast.success('Platform configurations saved successfully')
    } else { 
      const d = await res.json()
      toast.error(d.error || 'Configuration lock failed') 
    }
    setSaving(false)
  }

  const inputCls = "w-full bg-zinc-950 border border-zinc-900 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors font-mono"
  const labelCls = "block text-[10px] font-bold text-zinc-550 uppercase tracking-wider mb-1.5"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-zinc-950 text-zinc-550 text-xs font-mono gap-2">
        <Loader2 className="size-4 animate-spin text-zinc-600" />
        <span>Loading system registries...</span>
      </div>
    )
  }

  const activeCategoryDetail = CATEGORIES.find(c => c.id === activeTab)!

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto bg-zinc-950 min-h-screen text-zinc-100 font-mono">
      
      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2 select-none">
          <Settings className="size-3" />
          <span>System registry variables</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight uppercase select-none">Platform Configuration</h1>
        <p className="text-zinc-500 text-xs mt-1 font-sans">
          Configure security, default templates, limits, and pricing layers.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Desktop Left Sticky Navigation Switcher */}
        <div className="hidden md:flex flex-col w-56 shrink-0 space-y-1 bg-zinc-955 border border-zinc-900 rounded p-2 sticky top-20 select-none">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === cat.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tablet & Mobile Dropdown Switcher */}
        <div className="md:hidden w-full relative select-none">
          <button
            type="button"
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded p-3 text-xs flex items-center justify-between text-zinc-300 font-bold"
          >
            <span className="flex items-center gap-2">
              <activeCategoryDetail.icon className="size-4 text-zinc-400" />
              {activeCategoryDetail.label}
            </span>
            <ChevronDown className="size-4 text-zinc-500" />
          </button>

          {showMobileNav && (
            <div className="absolute top-11 left-0 right-0 z-40 bg-zinc-950 border border-zinc-900 rounded shadow-2xl overflow-hidden py-1 divide-y divide-zinc-900">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(cat.id)
                      setShowMobileNav(false)
                    }}
                    className="w-full text-left px-4 py-3 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center gap-2.5"
                  >
                    <Icon className="size-4 text-zinc-500" />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Content right panel */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Active section container */}
          <div className="bg-zinc-955 border border-zinc-900 rounded p-6 space-y-5">
            
            {/* Active Section Header */}
            <div className="border-b border-zinc-900 pb-3 flex items-center gap-2">
              <activeCategoryDetail.icon className="size-4.5 text-zinc-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                {activeCategoryDetail.label}
              </h2>
            </div>

            {/* General Branding Category */}
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelCls}>Platform Brand Name</label>
                  <input value={settings.platform_name} onChange={set('platform_name')} className={inputCls} placeholder="Klinq" />
                </div>
                
                <div>
                  <label className={labelCls}>Platform Logo Resource URL</label>
                  <input value={settings.platform_logo_url} onChange={set('platform_logo_url')} className={inputCls} placeholder="https://..." />
                </div>
                
                <div>
                  <label className={labelCls}>System Support Email</label>
                  <input type="email" value={settings.support_email} onChange={set('support_email')} className={inputCls} placeholder="support@klinqcrm.in" />
                </div>
              </div>
            )}

            {/* Authentication Controls Category */}
            {activeTab === 'auth' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                  <div>
                    <p className="text-zinc-250 text-xs font-bold">Google Auth SSO</p>
                    <p className="text-zinc-550 text-[11px] mt-0.5">Allow login via organizational Google logins.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMock('google_auth', !mockSettings.google_auth)}
                    className="text-zinc-400 hover:text-white"
                  >
                    {mockSettings.google_auth ? (
                      <ToggleRight className="size-6 text-emerald-450" />
                    ) : (
                      <ToggleLeft className="size-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                  <div>
                    <p className="text-zinc-250 text-xs font-bold">Enforce MFA</p>
                    <p className="text-zinc-550 text-[11px] mt-0.5">Require multi-factor authentication for all administrators.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMock('force_mfa', !mockSettings.force_mfa)}
                    className="text-zinc-400 hover:text-white"
                  >
                    {mockSettings.force_mfa ? (
                      <ToggleRight className="size-6 text-emerald-450" />
                    ) : (
                      <ToggleLeft className="size-6" />
                    )}
                  </button>
                </div>

                <div>
                  <label className={labelCls}>System Session Timeout (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    value={mockSettings.session_timeout}
                    onChange={e => setMock('session_timeout', Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* Email Defaults Category */}
            {activeTab === 'email' && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelCls}>Sender Display Name</label>
                  <input value={settings.default_sender_name} onChange={set('default_sender_name')} className={inputCls} placeholder="Klinq CRM" />
                </div>
                <div>
                  <label className={labelCls}>Sender Verification Email</label>
                  <input type="email" value={settings.default_sender_email} onChange={set('default_sender_email')} className={inputCls} placeholder="noreply@klinqcrm.in" />
                </div>
                <div>
                  <label className={labelCls}>Daily Email threshold</label>
                  <input type="number" min={0} value={settings.daily_email_limit} onChange={set('daily_email_limit')} className={inputCls} />
                </div>
              </div>
            )}

            {/* Billing Configurations Category */}
            {activeTab === 'billing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                  <div>
                    <p className="text-zinc-250 text-xs font-bold">Razorpay Integration Mode</p>
                    <p className="text-zinc-550 text-[11px] mt-0.5">Toggle live billing keys or simulated testing nodes.</p>
                  </div>
                  <div className="flex gap-1.5 p-0.5 bg-zinc-900 border border-zinc-850 rounded">
                    {['test', 'live'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setMock('razorpay_mode', mode)}
                        className={`px-3 py-1.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                          mockSettings.razorpay_mode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pb-1">
                  <div>
                    <p className="text-zinc-250 text-xs font-bold">Auto-invoice Generation</p>
                    <p className="text-zinc-550 text-[11px] mt-0.5">Dispatch invoices immediately on month end cycles.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMock('auto_invoice', !mockSettings.auto_invoice)}
                    className="text-zinc-400 hover:text-white"
                  >
                    {mockSettings.auto_invoice ? (
                      <ToggleRight className="size-6 text-emerald-450" />
                    ) : (
                      <ToggleLeft className="size-6" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* APIs and Limits Category */}
            {activeTab === 'integrations' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Daily SMS Limit</label>
                  <input type="number" min={0} value={settings.daily_sms_limit} onChange={set('daily_sms_limit')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Daily WhatsApp Limit</label>
                  <input type="number" min={0} value={settings.daily_whatsapp_limit} onChange={set('daily_whatsapp_limit')} className={inputCls} />
                </div>
              </div>
            )}

            {/* Feature Flags Category */}
            {activeTab === 'flags' && (
              <div className="space-y-4">
                {[
                  { key: 'flag_ai_copilot' as keyof MockSettings, label: 'AI Assist Copilot', desc: 'Allow AI-guided drafting tools for client leads.' },
                  { key: 'flag_broadcasts' as keyof MockSettings, label: 'WhatsApp Broadcasts', desc: 'Access list broadcast channels for WhatsApp CRM integrations.' },
                  { key: 'flag_custom_roles' as keyof MockSettings, label: 'Granular Custom Roles', desc: 'Configure company specific permission matrices.' },
                  { key: 'flag_developer_api' as keyof MockSettings, label: 'Developer SDK Access', desc: 'Expose platform access tokens for integration.' },
                ].map(flag => (
                  <div key={flag.key} className="flex items-center justify-between border-b border-zinc-900/60 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <p className="text-zinc-250 text-xs font-bold">{flag.label}</p>
                      <p className="text-zinc-550 text-[11px] mt-0.5">{flag.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMock(flag.key, !mockSettings[flag.key])}
                      className="text-zinc-400 hover:text-white"
                    >
                      {mockSettings[flag.key] ? (
                        <ToggleRight className="size-6 text-emerald-450" />
                      ) : (
                        <ToggleLeft className="size-6" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Isolation & Security Category */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-3">
                  <div>
                    <p className="text-zinc-250 text-xs font-bold">Maintenance Isolation Mode</p>
                    <p className="text-zinc-550 text-[11px] mt-1 leading-relaxed">
                      Freeze all client nodes. Platform administrators retain clearance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      settings.maintenance_mode
                        ? 'bg-red-500/10 text-red-400 border-red-500/25'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-white'
                    }`}
                  >
                    {settings.maintenance_mode ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                
                {settings.maintenance_mode && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded p-4 flex gap-3 text-red-400 text-xs leading-relaxed font-mono">
                    <Terminal className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-500">PLATFORM ISOLATION ENGAGED</span> — Access is restricted for all standard workspaces.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Platform Secrets Category */}
            {activeTab === 'secrets' && (
              <div className="space-y-4">
                <div className="bg-zinc-900/20 border border-zinc-900 rounded p-4 space-y-3">
                  <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                    <KeyRound className="size-4 text-zinc-400" />
                    <span>Server environment variables</span>
                  </p>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Integration API keys are loaded via secure server environments. Storing them inside database nodes is blocked.
                  </p>
                  <div className="bg-zinc-950 border border-zinc-900 rounded px-3 py-2.5 font-mono text-[10px] text-zinc-450 space-y-1">
                    <p><span className="text-zinc-650"># Configuration keys</span></p>
                    <p>GEMINI_API_KEY=&lt;configured&gt;</p>
                    <p>RAZORPAY_KEY_ID=&lt;configured&gt;</p>
                    <p>FAST2SMS_API_KEY=&lt;configured&gt;</p>
                    <p>META_SYSTEM_USER_TOKEN=&lt;configured&gt;</p>
                  </div>
                </div>

                {envStatus && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Telemetry checksum status</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(envStatus).map(([key, configured]) => (
                        <div key={key} className="flex items-center justify-between gap-3 px-3 py-2 bg-zinc-900/10 border border-zinc-900 rounded">
                          <span className="text-[9px] font-mono text-zinc-500">{key}</span>
                          <span className={`flex items-center gap-1 text-[9px] font-bold ${
                            configured ? 'text-emerald-450' : 'text-red-400'
                          }`}>
                            {configured
                              ? <><CheckCircle2 className="size-3" /> OK</>
                              : <><XCircle className="size-3" /> MISSING</>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-955 text-xs font-bold px-6 py-3 rounded transition-colors disabled:opacity-50 cursor-pointer h-11"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin text-zinc-950" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? 'Saving changes...' : 'Save settings'}
            </button>
          </div>

        </div>

      </form>
    </div>
  )
}
