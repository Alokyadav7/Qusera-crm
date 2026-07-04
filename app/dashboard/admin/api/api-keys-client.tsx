'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Key, Plus, Trash2, KeyRound, Globe, Copy, ShieldAlert, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react'

// ── FIX W2: Webhook signing secret masked by default, reveal on explicit click ──
function WebhookSecretCell({ secret }: { secret: string }) {
  const [revealed, setRevealed] = useState(false)
  if (!secret) return <span className="text-muted-foreground">—</span>
  const masked = secret.slice(0, 6) + '••••••••••••' + secret.slice(-4)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs">{revealed ? secret : masked}</span>
      <button
        type="button"
        onClick={() => setRevealed(v => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title={revealed ? 'Hide secret' : 'Reveal secret'}
      >
        {revealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      </button>
    </span>
  )
}

export interface ApiKeyRecord {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
  is_active: boolean
}

export interface WebhookRecord {
  id: string
  url: string
  events: string[]
  secret: string
  is_active: boolean
  created_at: string
}

export function ApiKeysPageClient({
  isEnterprise,
  initialKeys,
  initialWebhooks
}: {
  isEnterprise: boolean
  initialKeys: ApiKeyRecord[]
  initialWebhooks: WebhookRecord[]
}) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys)
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>(initialWebhooks)
  
  const [keyOpen, setKeyOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newGeneratedKey, setNewGeneratedKey] = useState('')
  const [keySaving, setKeySaving] = useState(false)

  const [whOpen, setWhOpen] = useState(false)
  const [whUrl, setWhUrl] = useState('')
  const [whEvents, setWhEvents] = useState<string[]>(['lead_created'])
  const [whSaving, setWhSaving] = useState(false)

  // Real-time
  useEffect(() => {
    if (!isEnterprise) return
    const supabase = createClient()
    
    const keyChannel = supabase
      .channel('keys-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_keys' }, payload => {
        if (payload.eventType === 'INSERT') {
          setKeys(prev => [payload.new as ApiKeyRecord, ...prev])
        } else if (payload.eventType === 'DELETE') {
          setKeys(prev => prev.filter(k => k.id !== (payload.old as any).id))
        }
      })
      .subscribe()

    const whChannel = supabase
      .channel('wh-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'webhooks' }, payload => {
        if (payload.eventType === 'INSERT') {
          setWebhooks(prev => [payload.new as WebhookRecord, ...prev])
        } else if (payload.eventType === 'DELETE') {
          setWebhooks(prev => prev.filter(w => w.id !== (payload.old as any).id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(keyChannel)
      supabase.removeChannel(whChannel)
    }
  }, [isEnterprise])

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      toast.error('Key description name required')
      return
    }
    setKeySaving(true)
    const supabase = createClient()
    try {
      const rawToken = 'Klinq_' + Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')
      const prefix = rawToken.slice(0, 10)
      
      // Compute SHA-256 hash using web crypto
      const msgUint8 = new TextEncoder().encode(rawToken)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const { data: { user } } = await supabase.auth.getUser()
      const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()

      const { error } = await (supabase as any).from('api_keys').insert({
        company_id: uac.data.company_id,
        name: keyName.trim(),
        key_prefix: prefix,
        key_hash: hashHex,
        created_by: user!.id
      })

      if (error) throw error
      
      setNewGeneratedKey(rawToken)
      setKeyName('')
      toast.success('API Key generated successfully')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setKeySaving(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Revoke this API Key permanently?')) return
    const supabase = createClient()
    const { error } = await supabase.from('api_keys').delete().eq('id', id)
    if (error) toast.error('Failed to revoke')
    else toast.success('API Key revoked')
  }

  const handleCreateWebhook = async () => {
    if (!whUrl.trim()) {
      toast.error('Webhook payload URL required')
      return
    }
    setWhSaving(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()

      const { error } = await (supabase as any).from('webhooks').insert({
        company_id: uac.data.company_id,
        url: whUrl.trim(),
        events: whEvents,
        created_by: user!.id
      })

      if (error) throw error
      toast.success('Webhook registered')
      setWhOpen(false)
      setWhUrl('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setWhSaving(false)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this Webhook registration?')) return
    const supabase = createClient()
    const { error } = await supabase.from('webhooks').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else toast.success('Webhook deleted')
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Feature Flag/Plan Blocked UI
  if (!isEnterprise) {
    return (
      <div className="flex flex-col min-h-screen">
        <CRMHeader title="API Access & Webhooks" subtitle="Developer Integrations Platform Settings" />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
          <div className="size-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
            <ShieldAlert className="size-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Enterprise Plan Required</h2>
          <p className="text-muted-foreground text-sm mb-6">
            REST API integrations and outgoing webhooks are available exclusively to companies on the Enterprise subscription tier. Upgrade your account plan to unlock automation endpoints.
          </p>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Upgrade to Enterprise</Button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Developer API & Webhooks" subtitle="Manage REST API tokens and configure real-time trigger webhooks" />
      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList>
            <TabsTrigger value="keys" className="flex items-center gap-1.5">
              <Key className="size-4" /> API Credentials
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-1.5">
              <Globe className="size-4" /> Webhook Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Active API Tokens</h3>
              <Button size="sm" onClick={() => { setNewGeneratedKey(''); setKeyOpen(true) }}>
                <Plus className="size-4 mr-1" /> Generate Token
              </Button>
            </div>

            {keys.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-muted/20 text-muted-foreground text-sm">
                No active API credentials generated.
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-card text-sm">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {['Description', 'Key Prefix', 'Last Used At', 'Created At', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {keys.map(k => (
                      <tr key={k.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{k.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}...</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(k.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="icon" className="size-7 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteKey(k.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Outgoing Webhook Endpoints</h3>
              <Button size="sm" onClick={() => setWhOpen(true)}>
                <Plus className="size-4 mr-1" /> Add Webhook
              </Button>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-muted/20 text-muted-foreground text-sm">
                No outbound webhooks registered.
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-card text-sm">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {['Payload URL', 'Subscribed Events', 'Signing Secret', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {webhooks.map(w => (
                      <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium truncate max-w-xs">{w.url}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {w.events.map(ev => (
                              <Badge key={ev} variant="outline" className="text-[10px] uppercase font-mono">{ev}</Badge>
                            ))}
                          </div>
                        </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          <WebhookSecretCell secret={w.secret} />
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="icon" className="size-7 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteWebhook(w.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Generate API Key Dialog */}
      <Dialog open={keyOpen} onOpenChange={setKeyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Integration Token</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!newGeneratedKey ? (
              <div className="grid gap-1.5">
                <Label>Key Description *</Label>
                <Input placeholder="e.g. Production server read-only key" value={keyName} onChange={e => setKeyName(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-3 bg-muted/40 p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs mb-2">
                  <AlertCircle className="size-4" />
                  Make sure to copy your API key now. It will not be shown again.
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={newGeneratedKey} className="font-mono text-sm" />
                  <Button size="icon" variant="outline" onClick={() => handleCopy(newGeneratedKey)}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {!newGeneratedKey ? (
              <>
                <Button variant="outline" onClick={() => setKeyOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerateKey} disabled={keySaving}>
                  {keySaving ? 'Generating...' : 'Generate'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setKeyOpen(false)}>Close & Continue</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={whOpen} onOpenChange={setWhOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Outgoing Webhook</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Payload URL *</Label>
              <Input placeholder="https://api.yourdomain.com/webhooks" value={whUrl} onChange={e => setWhUrl(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Trigger Events</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['lead_created', 'deal_won', 'contact_created'].map(ev => {
                  const active = whEvents.includes(ev)
                  return (
                    <Button 
                      key={ev}
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs capitalize h-7"
                      onClick={() => setWhEvents(prev => active ? prev.filter(x => x !== ev) : [...prev, ev])}
                    >
                      {ev.replace(/_/g, ' ')}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWebhook} disabled={whSaving}>
              {whSaving ? 'Registering...' : 'Register Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
