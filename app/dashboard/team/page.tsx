'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Shield, UserX, RefreshCw, Users, Mail, Crown } from 'lucide-react'
import { getRoleLabel, getRoleBadgeColor, ALL_ROLES, can, type Role } from '@/lib/permissions'
import { useActiveCompany } from '@/lib/company-context'

interface Member {
  id: string
  role: string
  is_active: boolean
  joined_at: string
  user: { id: string; full_name: string; email: string; avatar_url: string | null } | null
}

export default function TeamPage() {
  const { companyId } = useActiveCompany()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('sales_rep')
  const [inviting, setInviting] = useState(false)

  const fetchMembers = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const res = await fetch(`/api/team/members?company_id=${companyId}`)
    if (res.ok) {
      const json = await res.json()
      setMembers(json.data || [])

      // Get current user's role
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const me = (json.data as Member[]).find(m => m.user?.id === user.id)
        setMyRole(me?.role ?? null)
      }
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !companyId) return
    setInviting(true)

    // Derive full name from email if not provided
    const fullName = inviteFullName.trim() || inviteEmail.split('@')[0]
      .replace(/[._+-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Team Member'

    // Use /api/invites/send — creates a proper tokenized invite link + sends email
    const res = await fetch('/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail.trim(),
        role: inviteRole,
        fullName,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.emailError) {
        toast.warning(`Invite created but email failed: ${data.emailError}`)
      } else {
        toast.success(`Invitation sent to ${inviteEmail}`)
      }
      setInviteOpen(false)
      setInviteEmail('')
      setInviteFullName('')
      fetchMembers()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to send invite')
    }
    setInviting(false)
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!companyId) return
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, role: newRole }),
    })
    if (res.ok) {
      toast.success('Role updated')
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } else toast.error('Failed to update role')
  }

  const handleDeactivate = async (memberId: string, active: boolean) => {
    if (!companyId) return
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, is_active: active }),
    })
    if (res.ok) {
      toast.success(active ? 'Member reactivated' : 'Member deactivated')
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_active: active } : m))
    } else toast.error('Failed to update member')
  }

  const canManage = can(myRole, 'team.manage')
  const active = members.filter(m => m.is_active)
  const inactive = members.filter(m => !m.is_active)

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Team Management"
        subtitle={`${active.length} active member${active.length !== 1 ? 's' : ''} · Role-based access control`}
      />
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['company_admin','sales_manager','sales_rep','viewer'] as const).map(role => {
            const count = members.filter(m => m.role === role && m.is_active).length
            return (
              <div key={role} className="bg-card border rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{getRoleLabel(role)}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Users className="size-4" /> Active Members</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchMembers}>
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-4 mr-1.5" /> Invite Member
              </Button>
            )}
          </div>
        </div>

        {/* Active members */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground border rounded-xl bg-muted/10">
            <Users className="size-12 mb-3 opacity-30" />
            <p className="font-medium">No team members yet</p>
            <p className="text-sm mt-1">Invite your sales team to get started</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden divide-y">
            {active.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                    {(m.user?.full_name || m.user?.email || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.user?.full_name || 'Pending'}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="size-3" /> {m.user?.email}
                  </p>
                </div>
                <Badge className={`text-xs border ${getRoleBadgeColor(m.role)}`}>
                  {getRoleLabel(m.role)}
                </Badge>
                {canManage && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select value={m.role} onValueChange={v => handleRoleChange(m.id, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map(r => (
                          <SelectItem key={r} value={r} className="text-xs">{getRoleLabel(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { if (confirm('Deactivate this member?')) handleDeactivate(m.id, false) }}
                    >
                      <UserX className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Inactive members */}
        {inactive.length > 0 && (
          <div>
            <h2 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Shield className="size-4" /> Deactivated Members ({inactive.length})
            </h2>
            <div className="border rounded-xl overflow-hidden divide-y opacity-60">
              {inactive.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-sm bg-muted">{(m.user?.full_name || '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                  </div>
                  {canManage && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => handleDeactivate(m.id, true)}>Reactivate</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Permission matrix reference */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Crown className="size-4" />
            <span className="font-semibold text-sm">Permission Matrix</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/20">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Feature</th>
                  {(['company_admin','sales_manager','sales_rep','viewer'] as const).map(r => (
                    <th key={r} className="px-4 py-2 font-medium text-muted-foreground text-center">{getRoleLabel(r)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {([
                  ['View all leads',    'leads.view_all'],
                  ['Create/edit leads', 'leads.create'],
                  ['Delete leads',      'leads.delete'],
                  ['View all deals',    'deals.view_all'],
                  ['Delete deals',      'deals.delete'],
                  ['Send SMS/WhatsApp', 'sms.send'],
                  ['View reports',      'reports.view'],
                  ['Manage automations','automations.manage'],
                  ['Manage team',       'team.manage'],
                  ['View audit logs',   'audit_logs.view'],
                  ['Create invoices',   'invoices.create'],
                ] as const).map(([label, action]) => (
                  <tr key={action} className="hover:bg-muted/10">
                    <td className="px-4 py-2 font-medium text-foreground">{label}</td>
                    {(['company_admin','sales_manager','sales_rep','viewer'] as const).map(r => (
                      <td key={r} className="px-4 py-2 text-center">
                        {can(r, action as any) ? '✅' : '❌'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Invite Dialog — now uses /api/invites/send for proper token-based invites */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" /> Invite Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="text"
                placeholder="John Smith"
                value={inviteFullName}
                onChange={e => setInviteFullName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="sarah@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
              <p className="text-xs text-muted-foreground">
                They will receive an email with a secure link to set their password and join your team.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
