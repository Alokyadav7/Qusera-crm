'use client'

import { useState, useEffect, useCallback } from 'react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Copy, ExternalLink, Loader2, Save, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Integration {
  meta_page_access_token: string
  meta_page_id: string
  meta_app_id: string
  meta_connected: boolean
  google_ads_customer_id: string
  google_connected: boolean
  fast2sms_api_key: string
  fast2sms_sender_id: string
  sms_connected: boolean
  whatsapp_phone_number_id: string
  whatsapp_connected: boolean
  webhook_secret: string
}

const EMPTY: Integration = {
  meta_page_access_token: '', meta_page_id: '', meta_app_id: '', meta_connected: false,
  google_ads_customer_id: '', google_connected: false,
  fast2sms_api_key: '', fast2sms_sender_id: 'klinqC', sms_connected: false,
  whatsapp_phone_number_id: '', whatsapp_connected: false,
  webhook_secret: '',
}

function MaskedInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pr-10" />
      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShow(s => !s)}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <code className="text-xs text-primary break-all">{value}</code>
      </div>
      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied!') }}>
        <Copy className="size-4" />
      </Button>
    </div>
  )
}

export default function IntegrationsPage() {
  const [data, setData] = useState<Integration>(EMPTY)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [domain, setDomain] = useState('')

  useEffect(() => {
    setDomain(window.location.origin)
    const supabase = createClient()

    const loadIntegrations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data: intg } = await supabase.from('integrations').select('*').eq('user_id', user.id).single()
      if (intg) setData({ ...EMPTY, ...intg } as any)
      setLoading(false)
    }

    loadIntegrations()

    // ── Real-time: update when settings saved from another tab/device ──
    const channel = supabase
      .channel('integrations-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integrations' }, payload => {
        if (payload.new) {
          setData(d => ({ ...d, ...(payload.new as Partial<Integration>) }))
          toast.info('Integration settings synced in real-time ⚡')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const save = useCallback(async (section: string, fields: Partial<Integration>) => {
    setSaving(section)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(null); return }
    const payload = { user_id: user.id, ...fields, updated_at: new Date().toISOString() }
    const { error } = await (supabase as any).from('integrations').upsert(payload, { onConflict: 'user_id' })
    if (error) toast.error(error.message)
    else { toast.success(`${section} settings saved!`); setData(d => ({ ...d, ...fields })) }
    setSaving(null)
  }, [])

  const webhookUrl = (path: string) => `${domain}${path}?user_id=${userId}&secret=${data.webhook_secret}`

  const PLATFORMS = [
    {
      id: 'meta',
      name: 'Meta — Facebook & Instagram Lead Ads',
      icon: '📘',
      description: 'Auto-capture leads from your Facebook + Instagram ad campaigns.',
      badge: data.meta_connected ? 'Connected' : 'Not Connected',
      badgeOk: data.meta_connected,
      setupUrl: 'https://developers.facebook.com/apps',
      fields: (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Facebook Page Access Token</Label>
            <MaskedInput value={data.meta_page_access_token} onChange={v => setData(d => ({ ...d, meta_page_access_token: v }))} placeholder="EAAxxxxxx..." />
            <p className="text-xs text-muted-foreground">Get from: Meta Business Suite → Settings → Page Access Tokens</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Facebook Page ID</Label>
              <Input value={data.meta_page_id} onChange={e => setData(d => ({ ...d, meta_page_id: e.target.value }))} placeholder="123456789" />
            </div>
            <div className="space-y-1.5">
              <Label>App ID (optional)</Label>
              <Input value={data.meta_app_id} onChange={e => setData(d => ({ ...d, meta_app_id: e.target.value }))} placeholder="987654321" />
            </div>
          </div>
          <CopyField label="Your Webhook URL (paste in Meta)" value={webhookUrl('/api/webhooks/meta-leads')} />
          <CopyField label="Verify Token (paste in Meta)" value="KlinqCRM_webhook_verify_2024" />
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Steps to connect:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Go to developers.facebook.com → Your App → Webhooks</li>
              <li>Subscribe to "leadgen" event on your Facebook Page</li>
              <li>Paste Webhook URL and Verify Token above</li>
              <li>Go to your Page → Instant Forms → enable leads sharing</li>
            </ol>
          </div>
        </div>
      ),
      onSave: () => save('Meta', { meta_page_access_token: data.meta_page_access_token, meta_page_id: data.meta_page_id, meta_app_id: data.meta_app_id, meta_connected: !!data.meta_page_access_token }),
    },
    {
      id: 'google',
      name: 'Google Ads Lead Form',
      icon: '🔍',
      description: 'Auto-capture leads from Google Ads Lead Form Extensions.',
      badge: data.google_connected ? 'Connected' : 'Not Connected',
      badgeOk: data.google_connected,
      setupUrl: 'https://ads.google.com',
      fields: (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Google Ads Customer ID (optional)</Label>
            <Input value={data.google_ads_customer_id} onChange={e => setData(d => ({ ...d, google_ads_customer_id: e.target.value }))} placeholder="123-456-7890" />
          </div>
          <CopyField label="Your Webhook URL (paste in Google Ads)" value={webhookUrl('/api/webhooks/google-leads')} />
          <div className="p-3 bg-red-50 rounded-lg text-xs text-red-800 space-y-1">
            <p className="font-semibold">Steps to connect:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Go to Google Ads → Goals → Lead Form Extensions</li>
              <li>In your Lead Form → "Lead delivery" section</li>
              <li>Select "Webhook" and paste your URL above</li>
              <li>Click "Send test data" to verify</li>
            </ol>
          </div>
        </div>
      ),
      onSave: () => save('Google', { google_ads_customer_id: data.google_ads_customer_id, google_connected: true }),
    },
    {
      id: 'sms',
      name: 'Bulk SMS — Fast2SMS',
      icon: '📱',
      description: 'Send bulk SMS campaigns to your leads. India\'s leading SMS gateway.',
      badge: data.sms_connected ? 'Connected' : 'Not Connected',
      badgeOk: data.sms_connected,
      setupUrl: 'https://www.fast2sms.com/register',
      fields: (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Fast2SMS API Key</Label>
            <MaskedInput value={data.fast2sms_api_key} onChange={v => setData(d => ({ ...d, fast2sms_api_key: v }))} placeholder="Your Fast2SMS API key" />
            <p className="text-xs text-muted-foreground">Get from: fast2sms.com → Dashboard → Dev API</p>
          </div>
          <div className="space-y-1.5">
            <Label>Sender ID (6 chars, TRAI approved)</Label>
            <Input value={data.fast2sms_sender_id} maxLength={6} onChange={e => setData(d => ({ ...d, fast2sms_sender_id: e.target.value.toUpperCase() }))} placeholder="klinqC" />
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-xs text-green-800 space-y-1">
            <p className="font-semibold">Steps to connect:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Sign up free at fast2sms.com (50 SMS free)</li>
              <li>Go to Dashboard → Dev API → copy your API Key</li>
              <li>Register DLT templates on TRAI portal (mandatory India)</li>
              <li>Paste API Key above and save</li>
            </ol>
          </div>
        </div>
      ),
      onSave: () => save('SMS', { fast2sms_api_key: data.fast2sms_api_key, fast2sms_sender_id: data.fast2sms_sender_id, sms_connected: !!data.fast2sms_api_key }),
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API',
      icon: '💬',
      description: 'Send & receive WhatsApp messages directly from CRM.',
      badge: data.whatsapp_connected ? 'Connected' : 'Not Connected',
      badgeOk: data.whatsapp_connected,
      setupUrl: 'https://business.whatsapp.com',
      fields: (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Phone Number ID</Label>
            <Input value={data.whatsapp_phone_number_id} onChange={e => setData(d => ({ ...d, whatsapp_phone_number_id: e.target.value }))} placeholder="102030405060708" />
            <p className="text-xs text-muted-foreground">Found in Meta Business → WhatsApp → Phone Numbers</p>
          </div>
          <div className="space-y-1.5">
            <Label>Page Access Token</Label>
            <MaskedInput value={data.meta_page_access_token} onChange={v => setData(d => ({ ...d, meta_page_access_token: v }))} placeholder="EAAxxxxxx..." />
            <p className="text-xs text-muted-foreground">(Same token as Meta integration above)</p>
          </div>
          <CopyField label="WhatsApp Webhook URL" value={webhookUrl('/api/webhooks/whatsapp')} />
          <CopyField label="Verify Token" value="KlinqCRM_webhook_verify_2024" />
        </div>
      ),
      onSave: () => save('WhatsApp', { whatsapp_phone_number_id: data.whatsapp_phone_number_id, whatsapp_connected: !!data.whatsapp_phone_number_id }),
    },
  ]

  if (loading) return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Integrations" subtitle="Connect your marketing platforms" />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Integrations" subtitle="Connect Facebook, Instagram, Google Ads, SMS — leads flow in automatically" />
      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">

        {/* Your unique webhook ID */}
        {data.webhook_secret && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-1 flex items-center gap-2">🔑 Your Unique Webhook Identity</p>
              <p className="text-xs text-muted-foreground mb-2">All webhook URLs below include your unique ID. Leads sent to these URLs go directly to your account.</p>
              <CopyField label="Your User ID" value={userId} />
            </CardContent>
          </Card>
        )}

        {/* Platform cards */}
        {PLATFORMS.map(p => (
          <Card key={p.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{p.icon}</span>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.name}
                      <Badge variant={p.badgeOk ? 'default' : 'outline'}
                        className={p.badgeOk ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}>
                        {p.badgeOk ? <CheckCircle2 className="size-3 mr-1" /> : <AlertCircle className="size-3 mr-1" />}
                        {p.badge}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{p.description}</CardDescription>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => window.open(p.setupUrl, '_blank')}>
                  <ExternalLink className="size-4 mr-1" />Open Platform
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {p.fields}
              <Button onClick={p.onSave} disabled={saving === p.id.charAt(0).toUpperCase() + p.id.slice(1)}>
                {saving === p.id.charAt(0).toUpperCase() + p.id.slice(1)
                  ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</>
                  : <><Save className="size-4 mr-2" />Save & Activate</>}
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
