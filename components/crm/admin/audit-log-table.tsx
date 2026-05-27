'use client'

import { useState } from 'react'
import { ScrollText, Search, Database, Pencil, Trash2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow, format } from 'date-fns'
import type { AdminUser } from '@/lib/types/client'

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200',
}
const ACTION_ICONS: Record<string, typeof Plus> = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
}

interface AuditLog {
  id: string
  user_id: string | null
  table_name: string
  record_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  before_data: Record<string, any> | null
  after_data: Record<string, any> | null
  created_at: string
}

interface Props {
  logs: AuditLog[]
  users: AdminUser[]
}

export function AuditLogTable({ logs, users }: Props) {
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE'>('ALL')

  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  const filtered = logs.filter(log => {
    const matchesSearch =
      log.table_name.toLowerCase().includes(search.toLowerCase()) ||
      (log.record_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (userMap[log.user_id ?? '']?.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesAction = filterAction === 'ALL' || log.action === filterAction
    return matchesSearch && matchesAction
  })

  function getChangedFields(log: AuditLog): string[] {
    if (log.action !== 'UPDATE' || !log.before_data || !log.after_data) return []
    return Object.keys(log.after_data).filter(
      k => JSON.stringify(log.before_data![k]) !== JSON.stringify(log.after_data![k])
    )
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="size-4" /> Audit Log
            </CardTitle>
            <CardDescription>All create, update, and delete operations across your CRM</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {(['ALL', 'INSERT', 'UPDATE', 'DELETE'] as const).map(a => (
              <button
                key={a}
                onClick={() => setFilterAction(a)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  filterAction === a
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/50'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by table, user, or record ID…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Table</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Changed Fields</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">User</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const ActionIcon = ACTION_ICONS[log.action] ?? Database
                const actorUser = userMap[log.user_id ?? '']
                const changedFields = getChangedFields(log)
                return (
                  <tr
                    key={log.id}
                    className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs gap-1 ${ACTION_COLORS[log.action] ?? ''}`}>
                        <ActionIcon className="size-3" />
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{log.table_name}</span>
                      {log.record_id && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-[120px]">
                          {log.record_id.slice(0, 8)}…
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {changedFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {changedFields.slice(0, 4).map(f => (
                            <span key={f} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{f}</span>
                          ))}
                          {changedFields.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{changedFields.length - 4} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {log.action === 'INSERT' ? 'New record' : log.action === 'DELETE' ? 'Record deleted' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {actorUser ? (
                        <div>
                          <p className="text-xs font-medium">{actorUser.full_name || actorUser.email.split('@')[0]}</p>
                          <p className="text-[10px] text-muted-foreground">{actorUser.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">System / Webhook</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-xs text-muted-foreground" title={format(new Date(log.created_at), 'PPpp')}>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <ScrollText className="size-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {logs.length === 0
                        ? 'No audit events yet. Run the enterprise-readiness.sql migration to enable audit triggers.'
                        : 'No events match your filter'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground text-right px-4 py-2 border-t border-border">
          Showing {filtered.length} of {logs.length} events (last 100)
        </p>
      </CardContent>
    </Card>
  )
}
