'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Mail, Phone, CheckCircle2, AlertCircle, Loader2,
  Save, Wifi, WifiOff, AlertTriangle, X, RefreshCw,
  Shield, Zap
} from 'lucide-react'
import { WhatsAppConnectButton, type WAConnectResult } from '@/components/whatsapp-connect-button'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WAStatus {
  connected: boolean
  phone_number?: string
  display_name?: string
  quality_rating?: 'GREEN' | 'YELLOW' | 'RED'
  connected_at?: string
  expiring_soon?: boolean
  days_until_expiry?: number | null
}

interface IntegrationConfig {
  [key: string]: string
}

// ─── Quality pill ─────────────────────────────────────────────────────────────

function QualityBadge({ rating }: { rating: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    GREEN:  { label: 'Excellent', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    YELLOW: { label: 'Medium',    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    RED:    { label: 'Low',       cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }
  const { label, cls } = map[rating] ?? map.GREEN
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide border rounded-full px-2 py-0.5 ${cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

// ─── Disconnect confirm modal ─────────────────────────────────────────────────

function DisconnectModal({
  onConfirm, onCancel, loading,
}: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Disconnect WhatsApp?</p>
            <p className="text-zinc-500 text-xs mt-0.5">This will stop all message routing immediately.</p>
          </div>
        </div>
        <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
          Your message history will be preserved. To reconnect, visit this page and click Connect again.
          This does <strong className="text-zinc-200">not</strong> revoke access in Meta — do that in Meta Business Suite if needed.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Disconnect
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── WhatsApp Card ─────────────────────────────────────────────────────────────

function WhatsAppCard({ companyId }: { companyId: string }) {
  const [status, setStatus] = useState<WAStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [showDisconnect, setShowDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testing, setTesting] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false })
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleConnectSuccess = (data: WAConnectResult) => {
    toast.success(`✅ WhatsApp connected! Number: ${data.phone_number}`)
    fetchStatus()
  }

  const handleConnectError = (msg: string) => {
    toast.error(msg)
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/whatsapp/status', { method: 'DELETE' })
      if (res.ok) {
        toast.success('WhatsApp disconnected successfully.')
        setStatus({ connected: false })
        setShowDisconnect(false)
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to disconnect')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  const handleTest = async () => {
    if (!status?.connected) return
    setTesting(true)
    try {
      const res = await fetch('/api/whatsapp/status')
      const d = await res.json()
      if (d.connected) toast.success('✅ WhatsApp connection is active and healthy!')
      else toast.error('Connection test failed — please reconnect.')
      fetchStatus()
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      {showDisconnect && (
        <DisconnectModal
          onConfirm={handleDisconnect}
          onCancel={() => setShowDisconnect(false)}
          loading={disconnecting}
        />
      )}

      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            {/* WhatsApp icon */}
            <div className="size-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="size-5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.882l6.196-1.624A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.002-1.368l-.36-.214-3.68.965.981-3.594-.235-.37A9.819 9.819 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">WhatsApp Business</p>
              <p className="text-xs text-zinc-500">Meta Cloud API · Per-company number</p>
            </div>
          </div>
          {loadingStatus ? (
            <Loader2 className="size-4 animate-spin text-zinc-500" />
          ) : status?.connected ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <span className="size-2 rounded-full bg-zinc-600" />
              Not connected
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loadingStatus ? (
            <div className="space-y-2">
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/3" />
            </div>
          ) : status?.connected ? (
            /* ── CONNECTED STATE ──────────────────────────────────────────── */
            <div className="space-y-4">
              {/* Token expiry warning */}
              {status.expiring_soon && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Your WhatsApp connection expires in{' '}
                    <strong>{status.days_until_expiry} day{status.days_until_expiry !== 1 ? 's' : ''}</strong>.
                    Please reconnect to avoid service disruption.
                  </p>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Phone Number</p>
                  <p className="text-sm font-bold text-white font-mono">{status.phone_number}</p>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Business Name</p>
                  <p className="text-sm font-bold text-white truncate">{status.display_name ?? '—'}</p>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Quality Rating</p>
                  <QualityBadge rating={status.quality_rating ?? 'GREEN'} />
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Connected On</p>
                  <p className="text-sm font-medium text-zinc-300">
                    {status.connected_at
                      ? new Date(status.connected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                  Test Connection
                </button>
                {status.expiring_soon && (
                  <WhatsAppConnectButton
                    companyId={companyId}
                    onSuccess={handleConnectSuccess}
                    onError={handleConnectError}
                  />
                )}
                <button
                  onClick={() => setShowDisconnect(true)}
                  className="flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/30 px-4 py-2 rounded-xl transition-all cursor-pointer ml-auto"
                >
                  <X className="size-3.5" />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            /* ── NOT CONNECTED STATE ──────────────────────────────────────── */
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Connect your company's WhatsApp Business number to send and receive messages directly from the CRM.
                Each company uses their own number — fully isolated.
              </p>

              {/* How it works steps */}
              <div className="space-y-2">
                {[
                  'Click the button below — a Meta popup will open',
                  'Log into your Facebook Business account',
                  'Select or create your WhatsApp Business Account',
                  'Your number is verified and connected automatically',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="size-5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

              <WhatsAppConnectButton
                companyId={companyId}
                onSuccess={handleConnectSuccess}
                onError={handleConnectError}
              />

              <p className="text-[10px] text-zinc-600">
                Powered by Meta WhatsApp Business API. Official, secure, and compliant with Meta's policies.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Other integration cards (Email, SMS) ──────────────────────────────────────

interface SimpleIntegration {
  key: string
  label: string
  description: string
  icon: React.ElementType
  iconColor: string
  bgColor: string
  borderColor: string
  fields: { key: string; label: string; placeholder: string; type?: string }[]
}

const SIMPLE_INTEGRATIONS: SimpleIntegration[] = [
  {
    key: 'resend',
    label: 'Email (Resend)',
    description: 'Send transactional emails via Resend API',
    icon: Mail,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    fields: [
      { key: 'api_key', label: 'Resend API Key', placeholder: 're_xxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'from_email', label: 'From Email', placeholder: 'noreply@yourcompany.com' },
      { key: 'from_name', label: 'From Name', placeholder: 'Acme Corp' },
    ],
  },
  {
    key: 'fast2sms',
    label: 'SMS (Fast2SMS)',
    description: 'Bulk SMS for India via Fast2SMS API',
    icon: Phone,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    fields: [
      { key: 'api_key', label: 'Fast2SMS API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'sender_id', label: 'Sender ID', placeholder: 'MYFIRM' },
    ],
  },
]

function SimpleIntegrationCard({
  integration, companyId,
}: { integration: SimpleIntegration; companyId: string }) {
  const [config, setConfig] = useState<IntegrationConfig>({})
  const [connected, setConnected] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('company_integrations')
        .select('config, is_active')
        .eq('company_id', companyId)
        .eq('integration_type', integration.key)
        .single()
      if (data) {
        setConfig(data.config ?? {})
        setConnected(data.is_active ?? false)
      }
    }
    load()
  }, [companyId, integration.key])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const hasValues = Object.values(config).some(v => v?.trim())
    await (supabase as any).from('company_integrations').upsert({
      company_id: companyId,
      integration_type: integration.key,
      config,
      is_active: hasValues,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,integration_type' })
    setConnected(hasValues)
    toast.success(`${integration.label} settings saved`)
    setSaving(false)
  }

  const Icon = integration.icon

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-6 py-5 hover:bg-white/[0.01] transition-colors text-left cursor-pointer"
      >
        <div className={`size-10 rounded-xl ${integration.bgColor} border ${integration.borderColor} flex items-center justify-center shrink-0`}>
          <Icon className={`size-5 ${integration.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{integration.label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{integration.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {connected ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <span className="size-2 rounded-full bg-zinc-600" />
              Not connected
            </span>
          )}
          <div className={`size-5 flex items-center justify-center text-zinc-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/60 px-6 py-5 space-y-4 bg-zinc-950/20">
          {integration.fields.map(field => (
            <div key={field.key}>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                {field.label}
              </label>
              <input
                type={field.type ?? 'text'}
                placeholder={field.placeholder}
                value={config[field.key] ?? ''}
                onChange={e => setConfig(p => ({ ...p, [field.key]: e.target.value }))}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/[0.05] focus:border-zinc-600 transition-all"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-100 px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save Settings
            </button>
            {connected && (
              <button
                onClick={async () => {
                  setConfig({})
                  const supabase = createClient()
                  await (supabase as any).from('company_integrations').upsert({
                    company_id: companyId,
                    integration_type: integration.key,
                    config: {},
                    is_active: false,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'company_id,integration_type' })
                  setConnected(false)
                  toast.success(`${integration.label} disconnected`)
                }}
                className="flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <X className="size-3.5" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminIntegrationsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: m } = await (supabase as any)
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      setCompanyId(m?.company_id ?? null)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-8 xl:p-12 max-w-[750px]">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="p-8 xl:p-12 flex items-center justify-center">
        <div className="text-center">
          <Shield className="size-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No active company found. Complete onboarding first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[750px] relative">
      {/* Ambient glow */}
      <div className="absolute right-0 top-0 w-[400px] h-[400px] rounded-full bg-violet-600/[0.03] blur-[140px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-zinc-900 pb-6 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
          <Wifi className="size-3 text-violet-400" />
          <span>External Services</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight font-display">Integrations</h1>
        <p className="text-zinc-500 text-xs mt-1">
          Connect your communication channels — Email, WhatsApp, and SMS
        </p>
      </div>

      {/* Cards */}
      <div className="space-y-4 relative z-10">
        {/* WhatsApp — special card with Embedded Signup */}
        <WhatsAppCard companyId={companyId} />

        {/* Other integrations */}
        {SIMPLE_INTEGRATIONS.map(int => (
          <SimpleIntegrationCard key={int.key} integration={int} companyId={companyId} />
        ))}
      </div>
    </div>
  )
}
