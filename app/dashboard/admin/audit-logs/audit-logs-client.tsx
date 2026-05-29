'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Search, Download, Shield, Calendar, RefreshCw } from 'lucide-react'

export interface AuditLog {
  id: string
  action: string
  resource: string
  user_id: string | null
  details: Record<string, any>
  created_at: string
}

export function AuditLogsClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

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
      const headers = ['Timestamp', 'Action', 'Resource', 'Details']
      const rows = logs.map(l => [
        new Date(l.created_at).toISOString(),
        l.action,
        l.resource,
        JSON.stringify(l.details).replace(/"/g, '""')
      ])

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
      
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `crm-audit-logs-${new Date().toISOString().slice(0,10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Audit logs exported successfully')
    } catch (e: any) {
      toast.error('Failed to export logs: ' + e.message)
    }
  }

  const filtered = logs.filter(l => {
    const matchesSearch = !search || 
      l.action.toLowerCase().includes(search.toLowerCase()) || 
      l.resource.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase())
    
    const matchesAction = actionFilter === 'all' || l.action === actionFilter
    return matchesSearch && matchesAction
  })

  // Get unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)))

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Audit Logs" subtitle="Tamper-proof organizational activity trail for security compliance" />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="size-4 mr-1.5" /> Export to CSV
          </Button>
        </div>

        {/* Audit Log Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-muted/20">
            <Shield className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No log entries found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              All administrative, compliance, and core record activities will be captured here in real-time.
            </p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card text-sm">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {['Timestamp', 'Action', 'Resource', 'Details'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(l.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="uppercase font-mono text-[10px] tracking-wide">
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{l.resource}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono truncate max-w-md">
                      {JSON.stringify(l.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
