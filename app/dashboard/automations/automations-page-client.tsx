'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Play, Plus, Zap, Settings, History, Info, PlayCircle } from 'lucide-react'

export interface Automation {
  id: string
  name: string
  trigger_event: string
  conditions: Record<string, any>
  actions: any[]
  is_active: boolean
  run_count: number
  last_run_at: string | null
  created_at: string
}

export interface AutomationLog {
  id: string
  automation_id: string
  triggered_at: string
  status: 'success' | 'failed' | 'skipped'
  details: Record<string, any>
  automation?: { name: string } | null
}

const TRIGGERS = [
  { id: 'lead_created', label: 'Lead Created' },
  { id: 'lead_status_changed', label: 'Lead Status Changed' },
  { id: 'deal_stage_changed', label: 'Deal Stage Changed' },
  { id: 'task_overdue', label: 'Task Overdue' },
  { id: 'contact_created', label: 'Contact Created' }
]

const ACTIONS = [
  { id: 'send_email', label: 'Send Email via Resend' },
  { id: 'send_whatsapp', label: 'Send WhatsApp Message' },
  { id: 'create_task', label: 'Create Dashboard Task' },
  { id: 'assign_to_user', label: 'Assign to Team Representative' },
  { id: 'send_notification', label: 'Trigger Real-time Notification' }
]

export function AutomationsPageClient({ initialAutomations, initialLogs }: { initialAutomations: Automation[]; initialLogs: AutomationLog[] }) {
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations)
  const [logs, setLogs] = useState<AutomationLog[]>(initialLogs)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('lead_created')
  const [actionType, setActionType] = useState('send_notification')
  const [actionDetail, setActionDetail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to automations changes
    const autoChannel = supabase
      .channel('automations-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automations' }, payload => {
        if (payload.eventType === 'INSERT') {
          setAutomations(prev => [payload.new as Automation, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setAutomations(prev => prev.map(a => a.id === payload.new.id ? payload.new as Automation : a))
        }
      })
      .subscribe()

    // Subscribe to logs
    const logsChannel = supabase
      .channel('logs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_logs' }, async (payload) => {
        let newLog = payload.new as AutomationLog
        const { data } = await supabase.from('automations').select('name').eq('id', newLog.automation_id).single()
        if (data) newLog.automation = data
        setLogs(prev => [newLog, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(autoChannel)
      supabase.removeChannel(logsChannel)
    }
  }, [])

  const handleToggle = async (id: string, current: boolean) => {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('automations')
      .update({ is_active: !current })
      .eq('id', id)
    if (error) {
      toast.error('Failed to toggle status')
    } else {
      toast.success(`Rule ${!current ? 'activated' : 'paused'}`)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Automation name required')
      return
    }
    setSaving(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uac = await (supabase as any).from('user_active_company').select('company_id').eq('user_id', user!.id).single()

      const { error } = await (supabase as any).from('automations').insert({
        company_id: uac.data.company_id,
        name: name.trim(),
        trigger_event: trigger,
        conditions: {},
        actions: [{ type: actionType, config: { detail: actionDetail } }],
        is_active: true,
        created_by: user!.id
      })

      if (error) throw error
      toast.success('Workflow automation created')
      setAddOpen(false)
      setName('')
      setActionDetail('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Workflow Automations" subtitle="Trigger-Action Automation Builder & Webhook Execution Engine" />
      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="rules" className="flex items-center gap-1.5">
                <Zap className="size-4" /> Active Rules
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1.5">
                <History className="size-4" /> Execution Logs
              </TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4 mr-1" /> New Rule
            </Button>
          </div>

          <TabsContent value="rules" className="space-y-4">
            {automations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-muted/20">
                <Zap className="size-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No automations</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Create trigger-action workflows to instantly automate notifications, assign leads, or dispatch communication alerts.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {automations.map(a => (
                  <div key={a.id} className="bg-card border rounded-xl p-5 flex flex-col justify-between hover:border-primary/20 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="font-semibold text-sm line-clamp-1">{a.name}</h4>
                        <Switch checked={a.is_active} onCheckedChange={() => handleToggle(a.id, a.is_active)} />
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span>Trigger</span>
                          <span className="font-medium text-foreground uppercase">{a.trigger_event.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-1">
                          <span>Action</span>
                          <span className="font-medium text-foreground capitalize">
                            {(a.actions?.[0]?.type ?? 'Notification').replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <PlayCircle className="size-3.5 text-primary" /> {a.run_count} runs
                      </span>
                      <span>
                        {a.last_run_at ? `Last run: ${new Date(a.last_run_at).toLocaleDateString()}` : 'Never run'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs">
            {logs.length === 0 ? (
              <div className="text-center py-20 border rounded-xl bg-muted/20 text-sm text-muted-foreground">
                No logs recorded yet. Workflow triggers will capture diagnostics here.
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-card text-sm">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {['Rule Name', 'Triggered At', 'Status', 'Diagnostics'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{l.automation?.name ?? 'Deleted Rule'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(l.triggered_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={l.status === 'success' ? 'default' : l.status === 'skipped' ? 'secondary' : 'destructive'}
                            className="text-xs uppercase"
                          >
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono truncate max-w-xs">
                          {JSON.stringify(l.details)}
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

      {/* Add Rule Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Automation Workflow</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Rule Name *</Label>
              <Input placeholder="e.g. Lead Alert Notification" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Trigger Event *</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Execute Action *</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Action Configurations (Plaintext / JSON Config)</Label>
              <Input placeholder="e.g. rep_id: 123 OR Hello from CRM" value={actionDetail} onChange={e => setActionDetail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
