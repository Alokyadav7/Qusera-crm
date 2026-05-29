'use client'

import { Building2, Globe, Phone, User } from 'lucide-react'
import type { Lead } from '@/hooks/use-realtime-leads'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  clients: Lead[]
  onRefresh: () => void
}

export function ClientRegistryTable({ clients, onRefresh }: Props) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
        <Building2 className="size-8 opacity-30" />
        <p className="text-sm">No clients registered yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {['Client', 'Status', 'Value', 'Source', 'Created'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {clients.map((client: any) => (
            <tr key={client.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded bg-primary/10 flex items-center justify-center">
                    <Building2 className="size-3.5 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.full_name ?? client.name}</p>
                    {client.company && <p className="text-xs text-muted-foreground">{client.company}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="text-[10px] capitalize">{client.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm">
                  {client.deal_value ? `₹${Number(client.deal_value).toLocaleString('en-IN')}` : '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground capitalize">{client.source ?? '—'}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {client.created_at ? formatDistanceToNow(new Date(client.created_at), { addSuffix: true }) : '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
