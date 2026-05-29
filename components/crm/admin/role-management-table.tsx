'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react'
import type { Role, AdminUser } from '@/lib/types/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  roles: Role[]
  users: AdminUser[]
  onRefresh: () => void
}

export function RoleManagementTable({ roles, users, onRefresh }: Props) {
  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
        <Shield className="size-8 opacity-30" />
        <p className="text-sm">No roles configured</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {['Role', 'Type', 'Permissions', 'Users'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {roles.map(role => {
            const userCount = users.filter(u => u.roles?.some(r => r.id === role.id)).length
            const permKeys = Object.entries(role.permissions ?? {})
              .filter(([, v]) => v === true)
              .map(([k]) => k)
              .slice(0, 3)

            return (
              <tr key={role.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Shield className="size-3.5 text-primary/60" />
                    <span className="text-sm font-medium">{role.name}</span>
                  </div>
                  {role.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={role.is_system ? 'secondary' : 'outline'} className="text-[10px]">
                    {role.is_system ? 'System' : 'Custom'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {permKeys.map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 bg-primary/8 text-primary rounded font-mono">
                        {p}
                      </span>
                    ))}
                    {permKeys.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">{userCount}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
