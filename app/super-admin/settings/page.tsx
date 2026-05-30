'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Globe, Mail, Shield, ToggleLeft, ToggleRight, Terminal, KeyRound, CheckCircle2, XCircle } from 'lucide-react'
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

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [envStatus, setEnvStatus] = useState<Record<string, boolean> | null>(null)


  useEffect(() => {
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/super-admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      toast.success('Platform settings saved successfully')
    } else { 
      const d = await res.json()
      toast.error(d.error || 'Configuration lock failed') 
    }
    setSaving(false)
  }

  const inputCls = "w-full bg-zinc-950 border border-zinc-900 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
  const labelCls = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-550 text-xs font-mono gap-2 bg-black min-h-screen">
        <Loader2 className="size-4 animate-spin text-zinc-400" />
        <span>Loading configurations...</span>
      </div>
    )
  }

  return (
    <div className="p-6 xl:p-10 space-y-6 max-w-[900px] bg-black min-h-screen text-zinc-100 selection:bg-zinc-800 relative">
      
      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2 select-none">
          <Shield className="size-3 text-zinc-350" />
          <span>Platform Variables</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight font-display select-none">
          Platform Settings
        </h1>
        <p className="text-zinc-550 text-xs mt-0.5">
          Configure global platform settings, default email templates, security thresholds and transaction limits
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* API Credentials Notice */}
        <div className="bg-zinc-955 border border-zinc-900 rounded p-5 space-y-3">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
            <KeyRound className="size-4 text-zinc-400" />
            <span>API Credentials</span>
          </p>
          <p className="text-zinc-400 text-[12px] leading-relaxed">
            Integration credentials (Gemini AI, Razorpay, WhatsApp, SMS) are managed via <span className="text-zinc-200 font-semibold">server environment variables</span>, not stored in the database.
          </p>
          <p className="text-zinc-500 text-[11px] leading-relaxed">
            To update API keys, edit your <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded text-[10px]">.env</code> file on the server (or Vercel / your hosting provider's environment variables panel) and redeploy.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 font-mono text-[10px] text-zinc-400 space-y-0.5">
            <p><span className="text-zinc-600"># Example variables to set on your server:</span></p>
            <p>GEMINI_API_KEY=&lt;your-key&gt;</p>
            <p>RAZORPAY_KEY_ID=&lt;your-key&gt;</p>
            <p>FAST2SMS_API_KEY=&lt;your-key&gt;</p>
            <p>META_SYSTEM_USER_TOKEN=&lt;your-token&gt;</p>
          </div>
        </div>

        {/* Branding Box */}
        <div className="bg-zinc-955 border border-zinc-900 rounded p-5 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Globe className="size-4 text-zinc-400" /> 
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
              <input type="email" value={settings.support_email} onChange={set('support_email')} className={inputCls} placeholder="support@klinqcrm.in" />
            </div>
          </div>
        </div>

        {/* Default Sender Box */}
        <div className="bg-zinc-955 border border-zinc-900 rounded p-5 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Mail className="size-4 text-zinc-400" /> 
            <span>Default Transactional Mail Sender</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sender Display Name</label>
              <input value={settings.default_sender_name} onChange={set('default_sender_name')} className={inputCls} placeholder="Klinq CRM" />
            </div>
            <div>
              <label className={labelCls}>Sender Verification Email</label>
              <input type="email" value={settings.default_sender_email} onChange={set('default_sender_email')} className={inputCls} placeholder="noreply@klinqcrm.in" />
            </div>
          </div>
        </div>

        {/* Global Limits Box */}
        <div className="bg-zinc-955 border border-zinc-900 rounded p-5 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Shield className="size-4 text-zinc-400" /> 
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
        <div className="bg-zinc-955 border border-zinc-900 rounded p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-zinc-250 text-sm font-bold tracking-tight">Maintenance Isolation Mode</p>
              <p className="text-zinc-500 text-xs mt-1 leading-relaxed max-w-md">
                When activated, all client organization containers are frozen and locked with a maintenance notice. Platform administrators are immune.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
              className={`flex items-center gap-2 px-3 py-2 rounded text-[11px] font-bold transition-all border cursor-pointer shrink-0 ${
                settings.maintenance_mode
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:bg-zinc-900 hover:text-white'
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
            <div className="bg-red-500/5 border border-red-500/20 rounded p-4 flex gap-3 text-red-400 text-xs leading-relaxed font-mono">
              <Terminal className="size-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-500">CAUTION: Platform Freeze Engaged</span> — All user nodes are locked from accessing the CRM dashboard.
              </div>
            </div>
          )}
        </div>

        {/* Environment Status — READ ONLY */}
        {envStatus && (
          <div className="bg-zinc-955 border border-zinc-900 rounded p-5 space-y-4">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Terminal className="size-4 text-zinc-400" />
              <span>Environment Variable Status</span>
              <span className="text-zinc-600 text-[10px] font-mono normal-case ml-auto">Read-only · Values never shown</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(envStatus).map(([key, configured]) => (
                <div key={key} className="flex items-center justify-between gap-3 px-3 py-2 bg-zinc-900/30 border border-zinc-900 rounded">
                  <span className="text-[10px] font-mono text-zinc-400">{key}</span>
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold shrink-0 ${
                    configured ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {configured
                      ? <><CheckCircle2 className="size-3" /> Configured</>
                      : <><XCircle className="size-3" /> Missing</>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-955 text-xs font-bold px-6 py-3 rounded transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="size-4 animate-spin text-zinc-950" /> : <Save className="size-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
