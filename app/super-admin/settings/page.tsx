'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/super-admin/ui'
import { Settings, Save, Loader2, Globe, Mail, Shield, ToggleLeft, ToggleRight, Terminal } from 'lucide-react'
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

const defaults: PlatformSettings = {
  platform_name: 'Klinq',
  platform_logo_url: '',
  support_email: 'support@Klinq.app',
  default_sender_name: 'Klinq CRM',
  default_sender_email: 'noreply@Klinq.app',
  daily_sms_limit: 500,
  daily_whatsapp_limit: 200,
  daily_email_limit: 1000,
  maintenance_mode: false,
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/super-admin/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.settings) setSettings({ ...defaults, ...data.settings }) })
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof PlatformSettings>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
      setSettings(s => ({ ...s, [key]: val }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/super-admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      toast.success('Platform configurations locked successfully')
    } else { 
      const d = await res.json()
      toast.error(d.error || 'Configuration lock failed') 
    }
    setSaving(false)
  }

  const inputCls = "w-full bg-zinc-950/60 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:ring-2 focus:ring-white/[0.04] focus:border-zinc-700 focus:bg-zinc-950 transition-all duration-200"
  const labelCls = "block text-[10px] font-bold text-zinc-450 uppercase tracking-wider mb-1.5"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-550 text-xs gap-2">
        <Loader2 className="size-4 animate-spin text-violet-400" />
        <span>Loading configurations...</span>
      </div>
    )
  }

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[850px] relative overflow-hidden">
      {/* Decorative gradient blurs */}
      <div className="absolute right-[5%] top-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/[0.02] blur-[120px] pointer-events-none" />
      <div className="absolute left-[10%] bottom-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-500/[0.01] blur-[140px] pointer-events-none" />

      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-6 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
          <Shield className="size-3 text-violet-400" />
          <span>Platform Variables</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight font-display">
          Platform Settings
        </h1>
        <p className="text-zinc-550 text-xs mt-1">
          Configure global platform settings, default email templates, security thresholds and transaction limits
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 relative z-10">
        {/* Branding Box */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Globe className="size-4 text-violet-400" /> 
            <span>Global Branding Config</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Platform Brand Name</label>
              <input value={settings.platform_name} onChange={set('platform_name')} className={inputCls} placeholder="Klinq" />
            </div>
            
            <div>
              <label className={labelCls}>Platform Logo Resource URL</label>
              <input value={settings.platform_logo_url} onChange={set('platform_logo_url')} className={inputCls} placeholder="https://..." />
            </div>
            
            <div className="sm:col-span-2">
              <label className={labelCls}>System Support Email</label>
              <input type="email" value={settings.support_email} onChange={set('support_email')} className={inputCls} placeholder="support@Klinq.app" />
            </div>
          </div>
        </div>

        {/* Default Sender Box */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Mail className="size-4 text-violet-400" /> 
            <span>Default Transactional Mail Sender</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sender Display Name</label>
              <input value={settings.default_sender_name} onChange={set('default_sender_name')} className={inputCls} placeholder="Klinq CRM" />
            </div>
            <div>
              <label className={labelCls}>Sender Verification Email</label>
              <input type="email" value={settings.default_sender_email} onChange={set('default_sender_email')} className={inputCls} placeholder="noreply@Klinq.app" />
            </div>
          </div>
        </div>

        {/* Global Limits Box */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Shield className="size-4 text-violet-400" /> 
            <span>Global Company Limits (Daily Thresholds)</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Daily SMS Limit', key: 'daily_sms_limit' as keyof PlatformSettings },
              { label: 'Daily WhatsApp Limit', key: 'daily_whatsapp_limit' as keyof PlatformSettings },
              { label: 'Daily Email Limit', key: 'daily_email_limit' as keyof PlatformSettings },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input
                  type="number"
                  min={0}
                  value={settings[key] as number}
                  onChange={set(key)}
                  className={inputCls + " font-mono"}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Toggle Panel */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-zinc-200 text-sm font-bold tracking-tight">Maintenance Isolation Mode</p>
              <p className="text-zinc-500 text-xs mt-1 leading-relaxed max-w-md">
                When activated, all client organization containers are frozen and locked with a maintenance notice. Platform administrators are immune.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                settings.maintenance_mode
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-zinc-950 text-zinc-450 border-zinc-850 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              {settings.maintenance_mode ? (
                <><ToggleRight className="size-4.5" /> ON</>
              ) : (
                <><ToggleLeft className="size-4.5" /> OFF</>
              )}
            </button>
          </div>
          
          {settings.maintenance_mode && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-400 text-xs leading-relaxed">
              <Terminal className="size-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">CAUTION: Platform Freeze Engaged</span> — All user nodes are locked from accessing the CRM dashboard.
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md cursor-pointer text-xs"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'Locking Configurations...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
