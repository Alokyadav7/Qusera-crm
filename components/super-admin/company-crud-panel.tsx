'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  Users, Edit2, Trash2, Save, X, Loader2, Shield, UserMinus,
  ChevronRight, Building2, Activity, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Eye, UserCog, Mail, Clock, Crown
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
  slug: string
  status: string
  owner_email?: string
  industry?: string
  created_at: string
  suspension_reason?: string
}

interface Member {
  id: string
  user_id: string
  role: string
  is_active: boolean
  joined_at: string
  email: string | null
  full_name: string | null
  last_sign_in: string | null
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  admin: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  manager: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  member: 'text-zinc-400 bg-zinc-800 border-zinc-700',
  viewer: 'text-zinc-500 bg-zinc-900 border-zinc-800',
}

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? ROLE_COLORS.member
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest border rounded px-1.5 py-0.5 ${cls}`}>
      {role}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    trial: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    suspended: 'text-red-400 bg-red-500/10 border-red-500/20',
    canceled: 'text-zinc-500 bg-zinc-900 border-zinc-800',
  }
  const cls = map[status] ?? map.canceled
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest border rounded px-1.5 py-0.5 ${cls}`}>
      {status}
    </span>
  )
}

// ─── Edit Company Modal ───────────────────────────────────────────────────────

function EditCompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company: Company
  onClose: () => void
  onSaved: (updated: Partial<Company>) => void
}) {
  const [form, setForm] = useState({
    name: company.name,
    slug: company.slug,
    status: company.status,
    owner_email: company.owner_email ?? '',
    industry: company.industry ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      toast.success('Company updated successfully!')
      onSaved(form)
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const STATUSES = ['active', 'trial', 'suspended', 'canceled']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Edit2 className="size-5 text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Edit Company</p>
            <p className="text-zinc-500 text-xs">Changes are saved immediately</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-zinc-300 cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          {[
            { key: 'name', label: 'Company Name', placeholder: 'Acme Corp' },
            { key: 'slug', label: 'URL Slug', placeholder: 'acme-corp' },
            { key: 'owner_email', label: 'Owner Email', placeholder: 'admin@acme.com' },
            { key: 'industry', label: 'Industry', placeholder: 'SaaS, Fintech, Retail…' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                {field.label}
              </label>
              <input
                type="text"
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold text-zinc-950 bg-white hover:bg-zinc-100 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ company, onClose, onDeleted }: { company: Company; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirm !== company.name) { toast.error('Type the company name exactly to confirm'); return }
    setDeleting(true)
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}/edit`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete')
      toast.success(`${company.name} has been deleted (soft)`)
      onDeleted()
    } catch (err: any) {
      toast.error(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="size-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Delete Company</p>
            <p className="text-zinc-500 text-xs">This action soft-deletes. Data is retained for 30 days.</p>
          </div>
        </div>

        <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl p-3 mb-4">
          <p className="text-xs text-red-300 leading-relaxed">
            <strong>Warning:</strong> All members will lose access immediately. Type the company name below to confirm.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
            Type <span className="text-white font-black">{company.name}</span> to confirm
          </label>
          <input
            type="text"
            placeholder={company.name}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-red-500/40 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || confirm !== company.name}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Members Panel ────────────────────────────────────────────────────────────

function MembersPanel({ companyId }: { companyId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<{ id: string; role: string } | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/members`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(data.members ?? [])
    } catch (err: any) {
      toast.error('Failed to load members: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`Remove ${member.email ?? member.user_id} from this company?`)) return
    setRemovingId(member.id)
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Member removed')
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingRole) return
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: editingRole.id, role: editingRole.role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Role updated')
      setMembers(prev => prev.map(m => m.id === editingRole.id ? { ...m, role: editingRole.role } : m))
      setEditingRole(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const ROLES = ['owner', 'admin', 'manager', 'member', 'viewer']
  const activeMembers = members.filter(m => m.is_active)
  const inactiveMembers = members.filter(m => !m.is_active)

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <Users className="size-4 text-violet-400" />
          <h3 className="text-sm font-bold text-white">Team Members</h3>
          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-0.5">
            {members.length}
          </span>
        </div>
        <button
          onClick={fetchMembers}
          disabled={loading}
          className="size-7 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 flex items-center justify-center transition-all cursor-pointer"
          title="Refresh members"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Edit role modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-4">Change Member Role</h3>
            <select
              value={editingRole.role}
              onChange={e => setEditingRole({ ...editingRole, role: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white mb-4 focus:outline-none cursor-pointer"
            >
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setEditingRole(null)} className="flex-1 py-2 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer">Cancel</button>
              <button onClick={handleUpdateRole} className="flex-1 py-2 text-xs font-bold bg-white text-zinc-950 rounded-xl cursor-pointer">Save Role</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 text-zinc-600 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <Users className="size-7 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">No members in this company</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {/* Active members */}
          {activeMembers.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-zinc-900/30">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Active — {activeMembers.length}</p>
              </div>
              {activeMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/10 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="size-8 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-zinc-400">
                        {(member.full_name ?? member.email ?? member.user_id).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">
                          {member.full_name ?? <span className="italic text-zinc-500">No name</span>}
                        </p>
                        {member.role === 'owner' && <Crown className="size-3 text-amber-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {member.email && (
                          <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">{member.email}</p>
                        )}
                        {member.last_sign_in && (
                          <p className="text-[10px] text-zinc-600 flex items-center gap-1 shrink-0">
                            <Clock className="size-2.5" />
                            {formatDistanceToNow(new Date(member.last_sign_in), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <RoleBadge role={member.role} />
                    {/* Edit role */}
                    <button
                      onClick={() => setEditingRole({ id: member.id, role: member.role })}
                      className="size-7 rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 flex items-center justify-center transition-all cursor-pointer"
                      title="Change role"
                    >
                      <UserCog className="size-3.5" />
                    </button>
                    {/* Remove member */}
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={removingId === member.id}
                        className="size-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                        title="Remove member"
                      >
                        {removingId === member.id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <UserMinus className="size-3.5" />
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inactive members */}
          {inactiveMembers.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-zinc-900/30">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Inactive / Removed — {inactiveMembers.length}</p>
              </div>
              {inactiveMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between px-5 py-3 opacity-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <span className="text-xs text-zinc-600">{(member.full_name ?? member.email ?? member.user_id).charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 truncate">{member.email ?? member.user_id.slice(0, 16) + '…'}</p>
                    </div>
                  </div>
                  <RoleBadge role={member.role} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main CRUD panel ──────────────────────────────────────────────────────────

export function CompanyCRUDPanel({ company: initialCompany }: { company: Company }) {
  const router = useRouter()
  const [company, setCompany] = useState<Company>(initialCompany)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const handleSaved = (updates: Partial<Company>) => {
    setCompany(prev => ({ ...prev, ...updates }))
    router.refresh()
  }

  const handleDeleted = () => {
    router.push('/super-admin/companies')
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      {showEdit && (
        <EditCompanyModal company={company} onClose={() => setShowEdit(false)} onSaved={handleSaved} />
      )}
      {showDelete && (
        <DeleteModal company={company} onClose={() => setShowDelete(false)} onDeleted={handleDeleted} />
      )}

      {/* Company Info Card */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
              <Building2 className="size-6 text-zinc-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-white">{company.name}</h2>
                <StatusBadge status={company.status} />
              </div>
              <p className="text-zinc-500 text-xs">
                /{company.slug}
                {company.owner_email && <> · {company.owner_email}</>}
                {company.industry && <> · {company.industry}</>}
              </p>
              <p className="text-zinc-600 text-[11px] mt-1">
                Created {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              id="edit-company-btn"
            >
              <Edit2 className="size-3.5" /> Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/[0.08] hover:bg-red-500/[0.15] border border-red-500/20 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 transition-all cursor-pointer"
              id="delete-company-btn"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Status', value: <StatusBadge status={company.status} /> },
            { label: 'Slug', value: <span className="text-xs font-mono text-zinc-300">{company.slug}</span> },
            { label: 'Owner Email', value: <span className="text-xs text-zinc-300 truncate">{company.owner_email ?? '—'}</span> },
            { label: 'Industry', value: <span className="text-xs text-zinc-300">{company.industry ?? '—'}</span> },
          ].map(item => (
            <div key={item.label} className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{item.label}</p>
              <div>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Suspension reason if present */}
        {company.suspension_reason && (
          <div className="mt-4 flex items-start gap-2.5 p-3 bg-red-500/[0.05] border border-red-500/15 rounded-xl">
            <AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Suspension Reason</p>
              <p className="text-xs text-red-300/80">{company.suspension_reason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Members Panel */}
      <MembersPanel companyId={company.id} />
    </div>
  )
}
