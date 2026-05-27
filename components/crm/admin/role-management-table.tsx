'use client'

import { Shield, Crown, Lock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Role, AdminUser } from '@/lib/types/client'

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/10',
  admin:       'border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-950/10',
  manager:     'border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/10',
  sales_rep:   'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10',
  viewer:      'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30',
}
const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-300 dark:border-red-800/40',
  admin:       'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-300 dark:border-purple-800/40',
  manager:     'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300 dark:border-blue-800/40',
  sales_rep:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/40',
  viewer:      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
}

interface Props {
  roles: Role[]
  users: AdminUser[]
  onRefresh: () => void
}

export function RoleManagementTable({ roles, users }: Props) {
  function getUsersWithRole(roleId: string) {
    return users.filter(u => u.roles.some(r => r.id === roleId))
  }

  const PERMISSION_LABELS: Record<string, string> = {
    all:             'Full System Access',
    manage_users:    'Manage Users',
    manage_roles:    'Manage Roles',
    delete_leads:    'Delete Leads',
    view_audit:      'View Audit Logs',
    manage_clients:  'Manage Clients',
    view_all_data:   'View All Data',
    view_all_leads:  'View All Leads',
    assign_tasks:    'Assign Tasks',
    own_leads:       'Own Leads Only',
    own_tasks:       'Own Tasks Only',
    log_interactions:'Log Interactions',
    read_only:       'Read-Only Access',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        System roles are built-in and cannot be deleted. Assign them to users from the Users tab.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => {
          const usersWithRole = getUsersWithRole(role.id)
          const borderCls = ROLE_COLORS[role.name] ?? ROLE_COLORS.viewer
          const badgeCls = ROLE_BADGE[role.name] ?? ROLE_BADGE.viewer
          const permissions = Object.entries(role.permissions ?? {}).filter(([, v]) => v)

          return (
            <Card key={role.id} className={`border ${borderCls} shadow-sm`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {role.name === 'super_admin'
                      ? <Crown className="size-4 text-red-500" />
                      : <Shield className="size-4 text-muted-foreground" />}
                    <Badge variant="outline" className={`text-xs font-semibold capitalize ${badgeCls}`}>
                      {role.name.replace('_', ' ')}
                    </Badge>
                  </div>
                  {role.is_system && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Lock className="size-3" /> System
                    </span>
                  )}
                </div>
                <CardDescription className="mt-1 text-xs">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Permissions */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {permissions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      permissions.map(([key]) => (
                        <span key={key} className="flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="size-2.5 text-emerald-500" />
                          {PERMISSION_LABELS[key] ?? key}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Assigned users */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Assigned Users ({usersWithRole.length})
                  </p>
                  {usersWithRole.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {usersWithRole.map(u => (
                        <span key={u.id} className="text-xs bg-muted rounded px-2 py-0.5 truncate max-w-[120px]" title={u.email}>
                          {u.full_name || u.email.split('@')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
