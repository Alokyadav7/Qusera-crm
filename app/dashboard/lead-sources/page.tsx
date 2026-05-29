'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Globe, Facebook, Instagram, Search, TrendingUp,
  Users, Zap, RefreshCw, ExternalLink, CheckCircle2,
  AlertCircle, Clock, BarChart2, Filter, Loader2
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Lead {
  id: string
  full_name: string
  email: string | null
  phone_number: string | null
  company: string | null
  source: string | null
  status: string
  buying_intent: string | null
  created_at: string
  meta_ad_name: string | null
  google_campaign_id: string | null
}

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  facebook_ads:   { label: 'Facebook Ads',   color: 'text-blue-700',   bg: 'bg-blue-100',   icon: '📘' },
  instagram_ads:  { label: 'Instagram Ads',  color: 'text-pink-700',   bg: 'bg-pink-100',   icon: '📸' },
  google_ads:     { label: 'Google Ads',     color: 'text-red-700',    bg: 'bg-red-100',    icon: '🔍' },
  whatsapp:       { label: 'WhatsApp',       color: 'text-green-700',  bg: 'bg-green-100',  icon: '💬' },
  voice:          { label: 'Voice Note',     color: 'text-purple-700', bg: 'bg-purple-100', icon: '🎙️' },
  manual:         { label: 'Manual Entry',   color: 'text-slate-700',  bg: 'bg-slate-100',  icon: '✍️' },
  referral:       { label: 'Referral',       color: 'text-amber-700',  bg: 'bg-amber-100',  icon: '🤝' },
  website:        { label: 'Website',        color: 'text-indigo-700', bg: 'bg-indigo-100', icon: '🌐' },
  cold_call:      { label: 'Cold Call',      color: 'text-cyan-700',   bg: 'bg-cyan-100',   icon: '📞' },
  csv_import:     { label: 'CSV Import',     color: 'text-teal-700',   bg: 'bg-teal-100',   icon: '📄' },
}

function getSourceConfig(source: string | null) {
  return SOURCE_CONFIG[source || 'manual'] || SOURCE_CONFIG.manual
}

function getInitials(n: string) {
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const PLATFORM_INTEGRATIONS = [
  {
    id: 'meta',
    name: 'Meta (Facebook + Instagram)',
    icon: '📘',
    description: 'Capture leads from Facebook Lead Ads and Instagram Lead Ads automatically in real-time.',
    webhookPath: '/api/webhooks/meta-leads',
    setupUrl: 'https://developers.facebook.com/apps',
    envKey: 'META_WHATSAPP_TOKEN',
    steps: [
      'Go to developers.facebook.com → Create App',
      'Add "Leads Access" permission to your App',
      'Go to Webhooks → Subscribe to "leadgen" on your Page',
      'Set Callback URL to your domain + /api/webhooks/meta-leads',
      'Set Verify Token: KlinqCRM_webhook_verify_2024',
      'Add META_WHATSAPP_TOKEN (Page Access Token) to .env',
    ],
    sources: ['facebook_ads', 'instagram_ads'],
  },
  {
    id: 'google',
    name: 'Google Ads',
    icon: '🔍',
    description: 'Capture leads from Google Lead Form Extensions automatically.',
    webhookPath: '/api/webhooks/google-leads',
    setupUrl: 'https://ads.google.com',
    envKey: 'GOOGLE_LEADS_WEBHOOK_KEY',
    steps: [
      'Go to Google Ads → Campaigns → Lead Form Extensions',
      'Enable Lead Delivery via Webhook',
      'Set Webhook URL: your domain + /api/webhooks/google-leads',
      'Set Key: KlinqCRM_google_key (or add GOOGLE_LEADS_WEBHOOK_KEY to .env)',
      'New form submissions flow in automatically',
    ],
    sources: ['google_ads'],
  },
  {
    id: 'sms',
    name: 'Bulk SMS (Fast2SMS)',
    icon: '📱',
    description: 'Send bulk SMS to your leads via Fast2SMS — India\'s leading SMS gateway.',
    webhookPath: '/api/sms/send',
    setupUrl: 'https://fast2sms.com/dashboard/credentials',
    envKey: 'FAST2SMS_API_KEY',
    steps: [
      'Sign up at fast2sms.com (free 50 SMS)',
      'Get your API Key from the Dashboard',
      'Add FAST2SMS_API_KEY to .env',
      'Register DLT templates (required by TRAI for India)',
      'Use Bulk SMS page to send campaigns',
    ],
    sources: [],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    icon: '💬',
    description: 'Receive and send WhatsApp messages directly from the CRM.',
    webhookPath: '/api/webhooks/whatsapp',
    setupUrl: 'https://developers.facebook.com/docs/whatsapp',
    envKey: 'META_WHATSAPP_TOKEN',
    steps: [
      'Apply for WhatsApp Business API at business.whatsapp.com',
      'Get approved Meta Business Account',
      'Add META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID to .env',
      'Set webhook URL: your domain + /api/webhooks/whatsapp',
    ],
    sources: ['whatsapp'],
  },
]

export default function LeadSourcesPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({})

  const fetchLeads = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name, email, phone_number, company, source, status, buying_intent, created_at, meta_ad_name, google_campaign_id')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error || !data) {
        const res = await fetch('/api/data?table=leads&limit=200')
        if (res.ok) {
          const json = await res.json()
          setLeads((json.data || []) as Lead[])
        }
      } else {
        setLeads(data as unknown as Lead[])
      }
    } catch {
      const res = await fetch('/api/data?table=leads&limit=200')
      if (res.ok) {
        const json = await res.json()
        setLeads((json.data || []) as Lead[])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    const supabase = createClient()
    const channel = supabase.channel('lead-sources-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchLeads])

  // ── Source stats ──────────────────────────────────────────────────────────
  const sourceCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.source || 'manual'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !search || l.full_name.toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) || (l.phone_number || '').includes(q)
    const matchSource = sourceFilter === 'all' || (l.source || 'manual') === sourceFilter
    return matchSearch && matchSource
  })

  // ── Assign unclaimed lead to self ─────────────────────────────────────────
  const claimLead = async (leadId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('leads').update({ user_id: user.id, updated_at: new Date().toISOString() }).eq('id', leadId)
    if (error) toast.error(error.message)
    else { toast.success('Lead assigned to you!'); fetchLeads() }
  }

  const allSources = Object.keys(sourceCounts).sort((a, b) => sourceCounts[b] - sourceCounts[a])

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Lead Sources"
        subtitle={`${leads.length} total leads · Real-time from all platforms`}
      />
      <main className="flex-1 p-4 md:p-6 space-y-6">

        {/* Platform Cards */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Connected Platforms</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_INTEGRATIONS.map(p => {
              const count = p.sources.reduce((s, src) => s + (sourceCounts[src] || 0), 0)
              const isConfigured = p.envKey === 'META_WHATSAPP_TOKEN'
                ? true // show as potentially configured
                : false
              return (
                <Card key={p.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl">{p.icon}</div>
                      <Badge variant={count > 0 ? 'default' : 'outline'} className="text-xs">
                        {count > 0 ? `${count} leads` : 'No leads yet'}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm mb-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground mb-3">{p.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs"
                        onClick={() => window.open(p.setupUrl, '_blank')}>
                        <ExternalLink className="size-3 mr-1" />Setup
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <code className="bg-muted px-1 rounded">{p.webhookPath}</code>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {allSources.slice(0, 8).map(src => {
            const cfg = getSourceConfig(src)
            const pct = leads.length ? Math.round((sourceCounts[src] / leads.length) * 100) : 0
            return (
              <Card key={src} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSourceFilter(sourceFilter === src ? 'all' : src)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{cfg.icon}</span>
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{sourceCounts[src]}</p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct}% of all leads</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Live Feed */}
        <div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1">All Leads by Source</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-8 h-8 w-48 text-sm" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {allSources.map(s => (
                  <SelectItem key={s} value={s}>{getSourceConfig(s).icon} {getSourceConfig(s).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchLeads}>
              <RefreshCw className="size-4 mr-1" />Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border rounded-xl bg-muted/20">
              <Globe className="size-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No leads from {sourceFilter === 'all' ? 'any' : getSourceConfig(sourceFilter).label} source yet</p>
              <p className="text-sm text-muted-foreground mt-1">Connect a platform above to start receiving leads automatically</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(lead => {
                const cfg = getSourceConfig(lead.source)
                return (
                  <Card key={lead.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex size-8 items-center justify-center rounded-lg text-base ${cfg.bg} shrink-0`}>
                          {cfg.icon}
                        </div>
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{getInitials(lead.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{lead.full_name}</span>
                            <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{lead.status}</Badge>
                            {lead.buying_intent === 'high' && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Hot</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            {lead.email && <span>{lead.email}</span>}
                            {lead.phone_number && <span>{lead.phone_number}</span>}
                            {lead.company && <span>· {lead.company}</span>}
                            {lead.meta_ad_name && <span className="text-blue-600">Ad: {lead.meta_ad_name}</span>}
                            {lead.google_campaign_id && <span className="text-red-600">Campaign: {lead.google_campaign_id}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-5 text-primary" />Webhook URLs — Share with your platforms
            </CardTitle>
            <CardDescription>These are your production webhook endpoints. Replace YOUR_DOMAIN with your actual domain.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Meta (Facebook + Instagram) Lead Ads', url: 'https://YOUR_DOMAIN/api/webhooks/meta-leads', token: 'KlinqCRM_webhook_verify_2024', icon: '📘' },
              { label: 'Google Ads Lead Form', url: 'https://YOUR_DOMAIN/api/webhooks/google-leads', token: 'GET: health check', icon: '🔍' },
              { label: 'WhatsApp Business', url: 'https://YOUR_DOMAIN/api/webhooks/whatsapp', token: 'KlinqCRM_webhook_verify_2024', icon: '💬' },
            ].map(w => (
              <div key={w.label} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <span className="text-xl shrink-0">{w.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{w.label}</p>
                  <code className="text-xs text-primary">{w.url}</code>
                  <p className="text-xs text-muted-foreground mt-0.5">Verify Token: <code className="bg-muted px-1 rounded">{w.token}</code></p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0"
                  onClick={() => { navigator.clipboard.writeText(w.url); toast.success('Copied!') }}>
                  Copy
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
