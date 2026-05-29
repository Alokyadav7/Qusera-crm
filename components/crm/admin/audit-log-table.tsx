'use client'

import { ScrollText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AuditLog {
  id: string
  user_id: string | null
  table_name: string
  record_id: string | null
  action: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  created_at: string
}

interface AdminUser { id: string; email?: string }

interface Props {
  logs: AuditLog[]
  users: AdminUser[]
}

const ACTION_STYLES: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export function AuditLogTable({ logs, users }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
        <ScrollText className="size-8 opacity-30" />
        <p className="text-sm">No audit events recorded yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {['Action', 'Table', 'User', 'Time'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {logs.map(log => {
            const user = log.user_id ? users.find(u => u.id === log.user_id) : null
            return (
              <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${ACTION_STYLES[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-muted-foreground">{log.table_name}</span>
                  {log.record_id && <p className="text-[11px] text-muted-foreground/60 font-mono">{log.record_id.slice(0, 8)}…</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs">{user?.email ?? (log.user_id ? `${log.user_id.slice(0, 8)}…` : 'System')}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
