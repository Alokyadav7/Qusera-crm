'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Mail, Phone, Loader2, Save, Wifi, WifiOff, AlertTriangle, X,
  Shield, Zap, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react'
import { WhatsAppConnectButton, type WAConnectResult } from '@/components/whatsapp-connect-button'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface WAStatus {
  connected: boolean
  phone_number?: string
  display_name?: string
  quality_rating?: 'GREEN' | 'YELLOW' | 'RED'
  connected_at?: string
  expiring_soon?: boolean
  days_until_expiry?: number | null
}

function QualityBadge({ rating }: { rating: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    GREEN:  { label: 'Excellent', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    YELLOW: { label: 'Medium',    cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    RED:    { label: 'Low',       cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  }
  const { label, cls } = map[rating] ?? map.GREEN
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {label}
    </Badge>
  )
}

export default function AdminIntegrationsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // WhatsApp state
  const [waStatus, setWaStatus] = useState<WAStatus | null>(null)
  const [loadingWA, setLoadingWA] = useState(true)
  const [testingWA, setTestingWA] = useState(false)
  const [disconnectingWA, setDisconnectingWA] = useState(false)

  // SMTP state
  const [smtpExpanded, setSmtpExpanded] = useState(false)
  const [smtpConnected, setSmtpConnected] = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpForm, setSmtpForm] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    fromName: '',
  })

  // SMS state
  const [smsExpanded, setSmsExpanded] = useState(false)
  const [smsConnected, setSmsConnected] = useState(false)
  const [smsSaving, setSmsSaving] = useState(false)
  const [smsTesting, setSmsTesting] = useState(false)
  const [smsTestPhone, setSmsTestPhone] = useState('')
  const [smsForm, setSmsForm] = useState({
    apiKey: '',
    senderId: 'FSTSMS',
  })

  const loadCompanyContext = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    
    const { data: member } = await (supabase as any)
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const cid = member?.company_id ?? null
    setCompanyId(cid)
    setLoading(false)

    if (cid) {
      loadWhatsAppStatus()
      loadSmtpStatus(cid)
      loadSmsStatus(cid)
    }
  }, [])

  useEffect(() => {
    loadCompanyContext()
  }, [loadCompanyContext])

  // WA Handlers
  const loadWhatsAppStatus = async () => {
    setLoadingWA(true)
    try {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      setWaStatus(data)
    } catch {
      setWaStatus({ connected: false })
    } finally {
      setLoadingWA(false)
    }
  }

  const handleWAConnectSuccess = (data: WAConnectResult) => {
    toast.success(`WhatsApp connected! Number: ${data.phone_number}`)
    loadWhatsAppStatus()
  }

  const handleWAConnectError = (error: any) => {
    toast.error(`WhatsApp connection failed: ${error?.message || error || 'Unknown error'}`)
  }

  const testWAConnection = async () => {
    if (!waStatus?.connected) return
    setTestingWA(true)
    try {
      const res = await fetch('/api/whatsapp/status')
      const d = await res.json()
      if (d.connected) toast.success('WhatsApp connection is active and healthy!')
      else toast.error('Connection test failed — please reconnect.')
      loadWhatsAppStatus()
    } catch {
      toast.error('Could not connect to WhatsApp verification API.')
    } finally {
      setTestingWA(false)
    }
  }

  const disconnectWhatsApp = async () => {
    if (!confirm('Disconnect WhatsApp Business? This will stop all message routing immediately.')) return
    setDisconnectingWA(true)
    try {
      const res = await fetch('/api/whatsapp/status', { method: 'DELETE' })
      if (res.ok) {
        toast.success('WhatsApp disconnected successfully')
        setWaStatus({ connected: false })
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to disconnect')
      }
    } finally {
      setDisconnectingWA(false)
    }
  }

  // SMTP Handlers
  const loadSmtpStatus = async (cid: string) => {
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('company_integrations')
      .select('config, is_active')
      .eq('company_id', cid)
      .eq('integration_type', 'smtp')
      .single()

    if (data) {
      setSmtpConnected(data.is_active ?? false)
      setSmtpForm({
        host: data.config?.host ?? '',
        port: data.config?.port ?? '587',
        secure: !!data.config?.secure,
        user: data.config?.user ?? '',
        pass: data.config?.pass ?? '',
        fromName: data.config?.fromName ?? '',
      })
    }
  }

  const saveSmtpSettings = async () => {
    if (!companyId) return
    setSmtpSaving(true)
    const supabase = createClient()
    const hasValues = !!(smtpForm.host && smtpForm.user && smtpForm.pass)

    const { error } = await (supabase as any).from('company_integrations').upsert({
      company_id: companyId,
      integration_type: 'smtp',
      config: smtpForm,
      is_active: hasValues,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,integration_type' })

    if (error) {
      toast.error('Failed to save SMTP settings: ' + error.message)
    } else {
      setSmtpConnected(hasValues)
      toast.success('SMTP settings saved successfully!')
    }
    setSmtpSaving(false)
  }

  const testSmtpConnection = async () => {
    setSmtpTesting(true)
    try {
      const res = await fetch('/api/admin/integrations/smtp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'SMTP connection tested successfully!')
      } else {
        toast.error(data.error || 'SMTP connection test failed. Verify credentials.')
      }
    } catch {
      toast.error('SMTP test request failed.')
    } finally {
      setSmtpTesting(false)
    }
  }

  // SMS Handlers
  const loadSmsStatus = async (cid: string) => {
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('company_integrations')
      .select('config, is_active')
      .eq('company_id', cid)
      .eq('integration_type', 'fast2sms')
      .single()

    if (data) {
      setSmsConnected(data.is_active ?? false)
      setSmsForm({
        apiKey: data.config?.apiKey ?? '',
        senderId: data.config?.senderId ?? 'FSTSMS',
      })
    }
  }

  const saveSmsSettings = async () => {
    if (!companyId) return
    setSmsSaving(true)
    const supabase = createClient()
    const hasValues = !!smsForm.apiKey

    const { error } = await (supabase as any).from('company_integrations').upsert({
      company_id: companyId,
      integration_type: 'fast2sms',
      config: smsForm,
      is_active: hasValues,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,integration_type' })

    if (error) {
      toast.error('Failed to save SMS settings: ' + error.message)
    } else {
      setSmsConnected(hasValues)
      toast.success('SMS settings saved successfully!')
    }
    setSmsSaving(false)
  }

  const testSmsConnection = async () => {
    if (!smsForm.apiKey) {
      toast.error('Please input your Fast2SMS API Key first.')
      return
    }
    setSmsTesting(true)
    try {
      const res = await fetch('/api/admin/integrations/sms-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: smsForm.apiKey,
          phoneNumber: smsTestPhone || '9999999999',
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'Fast2SMS credentials verified!')
      } else {
        toast.error(data.error || 'Fast2SMS verification failed.')
      }
    } catch {
      toast.error('SMS test request failed.')
    } finally {
      setSmsTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading integrations dashboard...</p>
        </div>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="p-6">
        <div className="border border-destructive/50 rounded-xl p-6 bg-destructive/5 text-destructive max-w-md flex items-start gap-4">
          <Shield className="size-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg">Onboarding Required</h3>
            <p className="text-sm opacity-90 mt-1">Please complete your company configuration onboarding first.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Communications & Integrations" subtitle="Configure email SMTP relays, SMS gateways, and WhatsApp Business API" />

      <div className="p-6 max-w-3xl space-y-6">
        
        {/* WhatsApp Business API Card */}
        <Card className="border-border/60">
          <CardHeader className="pb-4 border-b flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="size-5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.882l6.196-1.624A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.002-1.368l-.36-.214-3.68.965.981-3.594-.235-.37A9.819 9.819 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base font-bold">WhatsApp Business</CardTitle>
                <CardDescription>Official Meta Cloud API connection</CardDescription>
              </div>
            </div>
            {loadingWA ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : waStatus?.connected ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-0 uppercase text-[10px] font-bold">
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="uppercase text-[10px] font-bold">
                Not Connected
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {loadingWA ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : waStatus?.connected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-border/50 rounded-xl p-3 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Phone Number</p>
                    <p className="text-xs font-mono font-bold">{waStatus.phone_number}</p>
                  </div>
                  <div className="border border-border/50 rounded-xl p-3 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Display Name</p>
                    <p className="text-xs font-bold truncate">{waStatus.display_name ?? '—'}</p>
                  </div>
                  <div className="border border-border/50 rounded-xl p-3 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Quality Rating</p>
                    <QualityBadge rating={waStatus.quality_rating ?? 'GREEN'} />
                  </div>
                  <div className="border border-border/50 rounded-xl p-3 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Connected On</p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {waStatus.connected_at ? new Date(waStatus.connected_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button onClick={testWAConnection} disabled={testingWA} size="sm" variant="outline" className="gap-1.5 text-xs shadow-sm">
                    {testingWA ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5 text-primary" />}
                    Test Connection
                  </Button>
                  <Button onClick={disconnectWhatsApp} disabled={disconnectingWA} size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 ml-auto text-xs">
                    {disconnectingWA ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-normal">
                  Connect your business number using Meta Cloud API. Log into Facebook, authenticate your Business Manager, select your number, and start messaging directly from leads.
                </p>
                <div className="flex">
                  <WhatsAppConnectButton
                    companyId={companyId}
                    onSuccess={handleWAConnectSuccess}
                    onError={handleWAConnectError}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email SMTP Relaying Card */}
        <Card className="border-border/60">
          <button
            onClick={() => setSmtpExpanded(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/10 transition-colors text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Mail className="size-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Email SMTP Relay</CardTitle>
                <CardDescription>Deliver invoices, updates, and templates via SMTP</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {smtpConnected ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 uppercase text-[10px] font-bold">Active</Badge>
              ) : (
                <Badge variant="secondary" className="uppercase text-[10px] font-bold">Inactive</Badge>
              )}
              {smtpExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </div>
          </button>

          {smtpExpanded && (
            <CardContent className="pt-2 pb-6 border-t border-border/40 bg-muted/[0.02] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">SMTP Host</Label>
                  <Input
                    placeholder="smtp.gmail.com"
                    value={smtpForm.host}
                    onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SMTP Port</Label>
                  <Input
                    placeholder="587"
                    value={smtpForm.port}
                    onChange={e => setSmtpForm(f => ({ ...f, port: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Username / Email</Label>
                  <Input
                    placeholder="example@gmail.com"
                    value={smtpForm.user}
                    onChange={e => setSmtpForm(f => ({ ...f, user: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password / App Key</Label>
                  <Input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={smtpForm.pass}
                    onChange={e => setSmtpForm(f => ({ ...f, pass: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sender Name (From)</Label>
                  <Input
                    placeholder="Acme CRM Team"
                    value={smtpForm.fromName}
                    onChange={e => setSmtpForm(f => ({ ...f, fromName: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="secure-conn"
                    checked={smtpForm.secure}
                    onCheckedChange={(checked) => setSmtpForm(f => ({ ...f, secure: !!checked }))}
                  />
                  <Label htmlFor="secure-conn" className="text-xs cursor-pointer select-none">
                    Use Secure Connection (SSL/TLS)
                  </Label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <Button onClick={saveSmtpSettings} disabled={smtpSaving} size="sm" className="gap-1.5 text-xs shadow-sm">
                  {smtpSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save SMTP
                </Button>
                <Button onClick={testSmtpConnection} disabled={smtpTesting} size="sm" variant="outline" className="gap-1.5 text-xs shadow-sm">
                  {smtpTesting ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* SMS Gateway Card */}
        <Card className="border-border/60">
          <button
            onClick={() => setSmsExpanded(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/10 transition-colors text-left focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Phone className="size-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">SMS (Fast2SMS)</CardTitle>
                <CardDescription>Transmit bulk message relays and OTP verifications</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {smsConnected ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 uppercase text-[10px] font-bold">Active</Badge>
              ) : (
                <Badge variant="secondary" className="uppercase text-[10px] font-bold">Inactive</Badge>
              )}
              {smsExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
            </div>
          </button>

          {smsExpanded && (
            <CardContent className="pt-2 pb-6 border-t border-border/40 bg-muted/[0.02] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Fast2SMS API Key</Label>
                  <Input
                    type="password"
                    placeholder="re_xxxxxxxxxxxxxxxx"
                    value={smsForm.apiKey}
                    onChange={e => setSmsForm(f => ({ ...f, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sender ID</Label>
                  <Input
                    placeholder="FSTSMS"
                    value={smsForm.senderId}
                    onChange={e => setSmsForm(f => ({ ...f, senderId: e.target.value }))}
                    maxLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Test Number (for verification)</Label>
                  <Input
                    placeholder="9999999999"
                    value={smsTestPhone}
                    onChange={e => setSmsTestPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <Button onClick={saveSmsSettings} disabled={smsSaving} size="sm" className="gap-1.5 text-xs shadow-sm">
                  {smsSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save Gateway
                </Button>
                <Button onClick={testSmsConnection} disabled={smsTesting} size="sm" variant="outline" className="gap-1.5 text-xs shadow-sm">
                  {smsTesting ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5 animate-spin" />}
                  Test SMS API
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  )
}
