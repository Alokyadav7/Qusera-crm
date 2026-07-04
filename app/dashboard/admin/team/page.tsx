'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, UserPlus, Loader2, Mail, UserX, Shield, Trash2,
  Phone, Briefcase, RefreshCw, Clock, Trophy, Award, TrendingUp, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, isPast } from 'date-fns'

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

const ROLES = ['owner', 'admin', 'manager', 'sales_rep', 'field_agent', 'support', 'marketing', 'viewer']
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  admin: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  manager: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  sales_rep: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  field_agent: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  support: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  marketing: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  viewer: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
}

interface Member {
  id: string
  user_id: string
  role: string
  department: string | null
  is_active: boolean
  created_at: string
  profile?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

interface PerformanceMetric {
  userId: string
  name: string
  role: string
  leadCount: number
  dealCount: number
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [performance, setPerformance] = useState<PerformanceMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  
  // Modals state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '', name: '', phone: '', role: 'sales_rep', department: '',
  })
  const [inviting, setInviting] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [resendingId, setResendingId] = useState<string | null>(null)

  // Deletion & Reassignment state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignmentData, setReassignmentData] = useState<{ leadsCount: number, dealsCount: number } | null>(null)
  const [reassignToUserId, setReassignToUserId] = useState<string>('')
  const [deleting, setDeleting] = useState(false)

  const loadInvites = useCallback(async (cid: string | null) => {
    if (!cid) return
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('invites')
      .select('id, email, role, expires_at, created_at')
      .eq('company_id', cid)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
    setPendingInvites(data ?? [])
  }, [])

  const computePerformance = useCallback(async (cid: string, memberList: Member[]) => {
    const supabase = createClient()
    
    // Fetch leads count per member
    const { data: leadsData } = await supabase
      .from('leads')
      .select('assigned_to')
      .eq('company_id' as any, cid)

    // Fetch deals count per member
    const { data: dealsData } = await (supabase as any)
      .from('deals')
      .select('assigned_to, stage')
      .eq('company_id', cid)

    const metrics: PerformanceMetric[] = memberList.map(m => {
      const uId = m.user_id
      const leadCount = (leadsData ?? []).filter(l => l.assigned_to === uId).length
      const dealCount = (dealsData ?? []).filter((d: any) => d.assigned_to === uId && d.stage === 'won').length

      return {
        userId: uId,
        name: m.profile?.full_name ?? 'Pending Rep',
        role: m.role,
        leadCount,
        dealCount
      }
    })

    setPerformance(metrics.sort((a, b) => (b.dealCount * 10 + b.leadCount) - (a.dealCount * 10 + a.leadCount)))
  }, [])

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

    const formattedMembers = (data ?? []).map((m: any) => ({
      ...m,
      profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
    }))

    setMembers(formattedMembers)
    loadInvites(cid)
    computePerformance(cid, formattedMembers)
    setLoading(false)
  }, [loadInvites, computePerformance])

  useEffect(() => { loadMembers() }, [loadMembers])

  async function handleInvite() {
    if (!inviteForm.email || !companyId) return
    setInviting(true)
    const res = await fetch('/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteForm.email,
        fullName: inviteForm.name,
        role: inviteForm.role,
        department: inviteForm.department,
      }),
    })
    if (res.ok) {
      toast.success(`Invite sent successfully to ${inviteForm.email}`)
      setInviteOpen(false)
      setInviteForm({ email: '', name: '', phone: '', role: 'sales_rep', department: '' })
      loadMembers()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to send invite')
    }
    setInviting(false)
  }

  async function handleRoleChange(memberId: string, userId: string, newRole: string) {
    // memberId = company_members.id (for the API endpoint)
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      toast.success('Role updated successfully')
      loadMembers()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to update role')
    }
  }

  async function handleToggleStatus(member: Member) {
    const newStatus = !member.is_active
    const res = await fetch(`/api/team/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newStatus }),
    })
    if (res.ok) {
      toast.success(`Member ${newStatus ? 'reactivated' : 'deactivated'} successfully`)
      loadMembers()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to toggle status')
    }
  }

  // Initial delete attempt
  async function triggerDelete(member: Member) {
    setSelectedMember(member)
    setDeleting(true)
    try {
      const res = await fetch(`/api/team/${member.user_id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      
      if (res.status === 422 && data.error === 'REASSIGNMENT_REQUIRED') {
        // Reassignment is required
        setReassignmentData({ leadsCount: data.leadsCount, dealsCount: data.dealsCount })
        setReassignOpen(true)
      } else if (res.ok) {
        toast.success('Member removed from team')
        loadMembers()
      } else {
        toast.error(data.error || 'Failed to delete member')
      }
    } catch {
      toast.error('An error occurred during deletion')
    } finally {
      setDeleting(false)
    }
  }

  // Execute delete with reassignment
  async function executeDeleteWithReassignment() {
    if (!selectedMember || !reassignToUserId) {
      toast.error('Please select a team member to reassign items to')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/team/${selectedMember.user_id}?reassignToUserId=${reassignToUserId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Member removed and records reassigned successfully!')
        setReassignOpen(false)
        setReassignToUserId('')
        setSelectedMember(null)
        setReassignmentData(null)
        loadMembers()
      } else {
        toast.error(data.error || 'Failed to complete removal')
      }
    } catch {
      toast.error('An error occurred during reassignment removal')
    } finally {
      setDeleting(false)
    }
  }

  async function handleResendInvite(invite: PendingInvite) {
    if (!companyId) return
    setResendingId(invite.id)
    const res = await fetch('/api/invites/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId: invite.id }),
    })
    if (res.ok) {
      toast.success(`Invite resent to ${invite.email}`)
      loadInvites(companyId)
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to resend invite')
    }
    setResendingId(null)
  }

  const initials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Team Management" subtitle="Invite colleagues, assign administrative roles, and monitor sales performance" />

      <div className="p-6 max-w-6xl space-y-6">
        
        {/* Top Section Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="size-5 text-primary" /> Active Workspace Users
              </h2>
              <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2 shadow-sm">
                <UserPlus className="size-4" /> Add Employee
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card className="overflow-hidden border-border/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        {['Employee', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground">
                            No team members configured yet
                          </td>
                        </tr>
                      ) : (
                        members.map(m => {
                          const name = m.profile?.full_name
                          const email = m.profile?.email
                          return (
                            <tr key={m.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="size-9 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {initials(name)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-xs text-foreground truncate">{name ?? '—'}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{email ?? 'No email'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                {m.role === 'owner' ? (
                                  <Badge className={`${ROLE_COLORS.owner} border`}>Owner</Badge>
                                ) : (
                                  <Select defaultValue={m.role} onValueChange={v => handleRoleChange(m.id, m.user_id, v)}>
                                    <SelectTrigger className="h-7 w-28 text-xs focus:ring-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLES.filter(r => r !== 'owner').map(r => (
                                        <SelectItem key={r} value={r} className="text-xs">
                                          {r.replace(/_/g, ' ')}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-xs font-medium text-muted-foreground">
                                {m.department ?? '—'}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                  m.is_active
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                }`}>
                                  {m.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  {m.role !== 'owner' && (
                                    <>
                                      <Button
                                        variant="ghost" size="icon"
                                        onClick={() => handleToggleStatus(m)}
                                        className="size-7 text-muted-foreground hover:text-foreground"
                                        title={m.is_active ? 'Deactivate' : 'Reactivate'}
                                      >
                                        <UserX className="size-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon"
                                        onClick={() => triggerDelete(m)}
                                        className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Remove member"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* Leaderboard/Performance Widget */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" /> Rep Performance
            </h2>
            <Card className="border-border/60">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold">Conversion Leaderboard</CardTitle>
                <CardDescription>Reps sorted by closed-won deals</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : performance.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No performance statistics available</p>
                ) : (
                  performance.map((p, idx) => (
                    <div key={p.userId} className="flex items-center justify-between pb-3 border-b last:border-0 border-border/40">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground/60 w-4">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{p.role.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div className="text-xs">
                          <p className="font-bold text-foreground">{p.dealCount}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">Won Deals</p>
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-muted-foreground">{p.leadCount}</p>
                          <p className="text-[9px] text-muted-foreground/80 uppercase">Leads</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                Pending Workspace Invitations
                <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">{pendingInvites.length}</Badge>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => loadInvites(companyId)} className="h-7 gap-1">
                <RefreshCw className="size-3" /> Refresh
              </Button>
            </div>
            <Card className="overflow-hidden border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {['Email', 'Role', 'Sent', 'Expires In', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map(invite => {
                      const expired = isPast(new Date(invite.expires_at))
                      return (
                        <tr key={invite.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-xs text-foreground">{invite.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] capitalize border-border/60">
                              {invite.role.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                            {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3">
                            {expired ? (
                              <Badge variant="destructive" className="text-[9px] uppercase font-bold">Expired</Badge>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium dark:text-amber-400">
                                {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline" size="sm"
                              onClick={() => handleResendInvite(invite)}
                              disabled={resendingId === invite.id}
                              className="h-7 text-xs gap-1.5 shadow-sm"
                            >
                              {resendingId === invite.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Mail className="size-3" />
                              )}
                              {expired ? 'Re-invite' : 'Resend'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Invite Employee Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" /> Invite Employee
            </DialogTitle>
            <DialogDescription>
              Inviting a team member creates their account immediately. They can set their own password via the email link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Rahul Sharma"
                value={inviteForm.name}
                onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
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
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="focus:ring-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.filter(r => r !== 'owner').map(r => (
                      <SelectItem key={r} value={r} className="capitalize text-xs">
                        {r.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteForm.email || !inviteForm.name || inviting} className="gap-2">
              {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {inviting ? 'Inviting…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassignment Modal */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5 text-destructive" /> Reassignment Required
            </DialogTitle>
            <DialogDescription>
              {selectedMember?.profile?.full_name || 'This user'} is currently assigned to <strong>{reassignmentData?.leadsCount} leads</strong> and <strong>{reassignmentData?.dealsCount} deals</strong>. You must reassign these resources before removing them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reassign Active Leads and Deals To</Label>
              <Select value={reassignToUserId} onValueChange={setReassignToUserId}>
                <SelectTrigger className="focus:ring-0">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.user_id !== selectedMember?.user_id && m.is_active)
                    .map(m => (
                      <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                        {m.profile?.full_name ?? 'Unnamed Rep'} ({m.role.replace(/_/g, ' ')})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReassignOpen(false); setSelectedMember(null) }}>Cancel</Button>
            <Button onClick={executeDeleteWithReassignment} disabled={!reassignToUserId || deleting} className="bg-destructive text-white hover:bg-destructive/90 gap-2">
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Reassign & Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
