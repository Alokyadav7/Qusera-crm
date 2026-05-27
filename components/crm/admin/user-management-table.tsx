'use client'

import { useState } from 'react'
import { Shield, UserCheck, UserX, Plus, Loader2, Crown, ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { AdminUser, Role } from '@/lib/types/client'
import { createClient } from '@/lib/supabase/client'

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/40',
  admin:       'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
  manager:     'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
  sales_rep:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
  viewer:      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
}

function RoleBadge({ name }: { name: string }) {
  const cls = ROLE_COLORS[name] ?? ROLE_COLORS.viewer
  return (
    <Badge variant="outline" className={`text-xs font-medium capitalize ${cls}`}>
      {name === 'super_admin' && <Crown className="size-3 mr-1" />}
      {name.replace('_', ' ')}
    </Badge>
  )
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email[0].toUpperCase()
}

interface Props {
  users: AdminUser[]
  roles: Role[]
  onRefresh: () => void
}

export function UserManagementTable({ users, roles, onRefresh }: Props) {
  const [assigning, setAssigning] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  async function assignRole(userId: string, roleId: string) {
    setAssigning(roleId)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId, assignedBy: user?.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('Role assigned successfully')
      onRefresh()
    } catch (err: any) {
      toast.error('Failed to assign role: ' + err.message)
    } finally {
      setAssigning(null)
    }
  }

  async function removeRole(userId: string, roleId: string) {
    setRemoving(roleId)
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success('Role removed')
      onRefresh()
    } catch (err: any) {
      toast.error('Failed to remove role: ' + err.message)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="size-4" /> User Management
        </CardTitle>
        <CardDescription>Assign and revoke roles for all CRM users</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Roles</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Last Sign-in</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const unassignedRoles = roles.filter(r =>
                  !user.roles.some(ur => ur.id === r.id)
                )
                return (
                  <tr key={user.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.full_name || '(No name)'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {!user.is_active && (
                          <Badge variant="outline" className="text-xs text-red-500 border-red-300 shrink-0">Banned</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        ) : (
                          user.roles.map(role => (
                            <button
                              key={role.id}
                              title="Click to remove this role"
                              disabled={removing === role.id}
                              onClick={() => removeRole(user.id, role.id)}
                              className="group relative"
                            >
                              <RoleBadge name={role.name} />
                              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-red-500/90 rounded text-white text-[10px] font-medium transition-opacity">
                                {removing === role.id ? <Loader2 className="size-3 animate-spin" /> : <UserX className="size-3" />}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy') : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={unassignedRoles.length === 0}>
                            <Plus className="size-3" /> Assign Role <ChevronDown className="size-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Assign role to {user.full_name || user.email}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {unassignedRoles.length === 0 ? (
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">All roles assigned</DropdownMenuItem>
                          ) : (
                            unassignedRoles.map(role => (
                              <DropdownMenuItem
                                key={role.id}
                                onClick={() => assignRole(user.id, role.id)}
                                disabled={assigning === role.id}
                              >
                                {assigning === role.id
                                  ? <Loader2 className="size-3 mr-2 animate-spin" />
                                  : <UserCheck className="size-3 mr-2" />}
                                <span className="capitalize">{role.name.replace('_', ' ')}</span>
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
