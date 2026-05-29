'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Users, UserPlus, Loader2, Mail, UserX, Shield,
  Phone, Briefcase
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

const ROLES = ['owner', 'admin', 'manager', 'sales_rep', 'field_agent']
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  sales_rep: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  field_agent: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
}

interface Member {
  id: string
  user_id: string
  role: string
  department: string | null
  is_active: boolean
  created_at: string
  last_active_at?: string
  profile?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '', name: '', phone: '', role: 'sales_rep', department: '',
  })
  const [inviting, setInviting] = useState(false)

  const loadMembers = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: memberData } = await (supabase as any)
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    const cid = memberData?.company_id
    if (!cid) { setLoading(false); return }
    setCompanyId(cid)

    // Fetch members with profiles join
    const { data } = await (supabase as any)
      .from('company_members')
      .select(`
        id, user_id, role, department, is_active, created_at,
        profiles:user_id (full_name, email, avatar_url)
      `)
      .eq('company_id', cid)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setMembers((data ?? []).map((m: any) => ({
      ...m,
      profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
    })))
    setLoading(false)
  }, [])

  useEffect(() => { loadMembers() }, [loadMembers])

  async function handleInvite() {
    if (!inviteForm.email || !companyId) return
    setInviting(true)
    const res = await fetch('/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteForm.email,
        full_name: inviteForm.name,
        phone: inviteForm.phone,
        role: inviteForm.role,
        department: inviteForm.department,
        company_id: companyId,
      }),
    })
    if (res.ok) {
      toast.success(`Invite sent to ${inviteForm.email}`)
      setInviteOpen(false)
      setInviteForm({ email: '', name: '', phone: '', role: 'sales_rep', department: '' })
      loadMembers()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to send invite')
    }
    setInviting(false)
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('company_members')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', memberId)
    if (error) toast.error(error.message)
    else { toast.success('Role updated'); loadMembers() }
  }

  async function handleDeactivate(memberId: string, memberName: string) {
    if (!confirm(`Deactivate ${memberName}? They will lose access but data is retained.`)) return
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('company_members')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', memberId)
    if (error) toast.error(error.message)
    else { toast.success('Member deactivated'); loadMembers() }
  }

  async function handleReactivate(memberId: string) {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('company_members')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', memberId)
    if (error) toast.error(error.message)
    else { toast.success('Member reactivated'); loadMembers() }
  }

  async function handleResetPassword(email: string) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) toast.success(`Password reset email sent to ${email}`)
    else toast.error('Failed to send reset email')
  }

  const initials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Team Management" subtitle="Manage members, roles, and invitations" />

      <div className="p-6 max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{members.length} members total</p>
          <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
            <UserPlus className="size-4" /> Add Employee
          </Button>
        </div>

        {loading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : (
          <div className="border rounded-xl bg-card overflow-hidden">
            {members.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No members yet. Invite your team.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {['Member', 'Role', 'Department', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const name = m.profile?.full_name
                    const email = m.profile?.email
                    return (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {initials(name)}
                            </div>
                            <div>
                              <p className="font-medium">{name ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">{email ?? 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Select defaultValue={m.role} onValueChange={v => handleRoleChange(m.id, v)}>
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {m.department ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            m.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {email && (
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => handleResetPassword(email)}
                                className="h-7 text-xs gap-1"
                                title="Send password reset"
                              >
                                <Mail className="size-3" />
                              </Button>
                            )}
                            {m.role !== 'owner' && (
                              m.is_active ? (
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => handleDeactivate(m.id, name ?? 'this member')}
                                  className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                                >
                                  <UserX className="size-3.5" /> Deactivate
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => handleReactivate(m.id)}
                                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 gap-1"
                                >
                                  <Shield className="size-3.5" /> Reactivate
                                </Button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" /> Add Employee
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  placeholder="Rahul Sharma"
                  value={inviteForm.name}
                  onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="email" className="pl-9"
                    placeholder="colleague@company.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="+91 98765 43210"
                    value={inviteForm.phone}
                    onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Sales"
                    value={inviteForm.department}
                    onChange={e => setInviteForm(f => ({ ...f, department: e.target.value }))}
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => r !== 'owner').map(r => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteForm.email || inviting} className="gap-2">
              {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
