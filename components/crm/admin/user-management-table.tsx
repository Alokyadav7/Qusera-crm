'use client'

import { Users, Shield, Key, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface Role { id: string; name: string }
interface AdminUser {
  id: string
  email?: string
  full_name?: string | null
  avatar_url?: string | null
  is_active?: boolean
  last_sign_in_at?: string | null
  roles?: Role[]
}

interface Props {
  users: AdminUser[]
  roles: Role[]
  onRefresh: () => void
}

export function UserManagementTable({ users, roles, onRefresh }: Props) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
        <Users className="size-8 opacity-30" />
        <p className="text-sm">No users found</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {['User', 'Roles', 'Status', 'Last Sign In', ''].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-primary">
                        {(user.full_name ?? user.email ?? '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.full_name ?? 'No name'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(user.roles ?? []).slice(0, 2).map(role => (
                    <Badge key={role.id} variant="secondary" className="text-[10px] gap-1">
                      <Shield className="size-2.5" />{role.name}
                    </Badge>
                  ))}
                  {(user.roles ?? []).length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                </div>
              </td>
              <td className="px-4 py-3">
                {user.is_active !== false ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />Active
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Inactive</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button title="More" className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors">
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
