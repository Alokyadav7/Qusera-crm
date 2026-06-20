'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Download, Shield, Calendar, RefreshCw, Eye, EyeOff, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export interface AuditLog {
  id: string
  company_id: string | null
  user_id: string | null
  user_email: string
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, any> | null
  new_value: Record<string, any> | null
  ip_address: string | null
  created_at: string
}

export function AuditLogsClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('audit-logs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, payload => {
        setLogs(prev => [payload.new as AuditLog, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleExport = () => {
    try {
      const headers = ['Timestamp', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Old Value', 'New Value']
      const rows = logs.map(l => [
        new Date(l.created_at).toISOString(),
        l.user_email || 'System',
        l.action,
        l.entity_type,
        l.entity_id,
        l.ip_address || '—',
        l.old_value ? JSON.stringify(l.old_value).replace(/"/g, '""') : '—',
        l.new_value ? JSON.stringify(l.new_value).replace(/"/g, '""') : '—'
      ])

      const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `klinq-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Audit logs CSV exported successfully!')
    } catch (e: any) {
      toast.error('Failed to export logs: ' + e.message)
    }
  }

  const filtered = logs.filter(l => {
    const searchString = `${l.user_email || ''} ${l.action || ''} ${l.entity_type || ''} ${l.ip_address || ''} ${l.old_value ? JSON.stringify(l.old_value) : ''} ${l.new_value ? JSON.stringify(l.new_value) : ''}`.toLowerCase()
    const matchesSearch = !search || searchString.includes(search.toLowerCase())
    const matchesAction = actionFilter === 'all' || l.action === actionFilter
    return matchesSearch && matchesAction
  })

  // Get unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)))

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete') || action.includes('removed')) return 'destructive'
    if (action.includes('create') || action.includes('invited')) return 'default'
    return 'secondary'
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Audit Trails & Compliance" subtitle="Real-time, immutable history of workspace administrative activities" />
      <main className="flex-1 p-6 space-y-6 max-w-5xl">
        
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search logs by actor, entity, action, values..." className="pl-8 text-xs focus:ring-0" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} className="text-xs shadow-sm gap-1.5">
            <Download className="size-4" /> Export logs (CSV)
          </Button>
        </div>

        {/* Audit Log Table & Details Splitted view */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card border-border/60">
                <Shield className="size-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-semibold mb-1">No activities found</h3>
                <p className="text-muted-foreground text-xs max-w-xs leading-normal">
                  All security configurations, team invites, setting modifications, and billing updates will populate here.
                </p>
              </div>
            ) : (
              <Card className="overflow-hidden border-border/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {['Timestamp', 'Actor', 'Action', 'Type', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map(l => (
                        <tr key={l.id} className={`hover:bg-muted/10 transition-colors ${selectedLog?.id === l.id ? 'bg-primary/5' : ''}`}>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(l.created_at).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-foreground truncate max-w-[120px]" title={l.user_email}>
                            {l.user_email || 'System'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getActionBadgeColor(l.action)} className="uppercase font-mono text-[9px] tracking-wide border-0 font-bold">
                              {l.action.replace(/team\./, '').replace(/lead\./, '').replace(/deal\./, '')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {l.entity_type}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => setSelectedLog(selectedLog?.id === l.id ? null : l)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* Details Sidebar panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Shield className="size-4 text-primary" /> Activity Details
            </h3>
            {selectedLog ? (
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Actor Email</span>
                    <p className="font-semibold text-foreground break-all">{selectedLog.user_email || 'System Operation'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">IP Address</span>
                    <p className="font-mono flex items-center gap-1 text-muted-foreground">
                      <Globe className="size-3" />
                      {selectedLog.ip_address || 'Internal (Local/API)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Entity ID</span>
                    <p className="font-mono text-muted-foreground break-all">{selectedLog.entity_id}</p>
                  </div>
                  {selectedLog.old_value && (
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Before State</span>
                      <pre className="p-2 border rounded-lg bg-muted/30 overflow-auto font-mono text-[10px] max-h-32">
                        {JSON.stringify(selectedLog.old_value, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.new_value && (
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">After State</span>
                      <pre className="p-2 border rounded-lg bg-muted/30 overflow-auto font-mono text-[10px] max-h-32">
                        {JSON.stringify(selectedLog.new_value, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border/80">
                <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[200px]">
                  <EyeOff className="size-8 mb-2 opacity-30" />
                  <p className="text-xs">Click the eye icon on any row to view complete state changes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
