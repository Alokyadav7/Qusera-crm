'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Users, Building2, ScrollText, Loader2 } from 'lucide-react'
import type { AdminUser, Role } from '@/lib/types/client'
import type { Lead } from '@/hooks/use-realtime-leads'

// Lazy-loaded tab components
import { UserManagementTable } from '@/components/crm/admin/user-management-table'
import { RoleManagementTable } from '@/components/crm/admin/role-management-table'
import { ClientRegistryTable } from '@/components/crm/admin/client-registry-table'
import { AuditLogTable } from '@/components/crm/admin/audit-log-table'

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [clients, setClients] = useState<Lead[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch users from admin API
      const usersRes = await fetch('/api/admin/users')
      if (usersRes.ok) {
        const { users: u } = await usersRes.json()
        setUsers(u ?? [])
      }

      const supabase = createClient()

      // Fetch all system roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('*')
        .order('name')
      setRoles(rolesData ?? [])

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*, contacts:client_contacts(*), addresses:client_addresses(*)')
        .order('created_at', { ascending: false })
      setClients((clientsData as any) ?? [])

      // Fetch audit logs (last 100)
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setAuditLogs(logsData ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Active Roles', value: roles.length, icon: Shield, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
    { label: 'Clients', value: clients.length, icon: Building2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Audit Events', value: auditLogs.length, icon: ScrollText, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Admin Panel"
        subtitle="Manage users, roles, clients, and system audit logs"
      />

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-3 shadow-sm">
              <div className={`size-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{loading ? '—' : s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main tabs */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <span>Loading admin data…</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="gap-2"><Users className="size-4" />Users ({users.length})</TabsTrigger>
              <TabsTrigger value="roles" className="gap-2"><Shield className="size-4" />Roles ({roles.length})</TabsTrigger>
              <TabsTrigger value="clients" className="gap-2"><Building2 className="size-4" />Clients ({clients.length})</TabsTrigger>
              <TabsTrigger value="audit" className="gap-2"><ScrollText className="size-4" />Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserManagementTable users={users} roles={roles} onRefresh={fetchAll} />
            </TabsContent>
            <TabsContent value="roles">
              <RoleManagementTable roles={roles} users={users} onRefresh={fetchAll} />
            </TabsContent>
            <TabsContent value="clients">
              <ClientRegistryTable clients={clients as any} onRefresh={fetchAll} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditLogTable logs={auditLogs} users={users} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
