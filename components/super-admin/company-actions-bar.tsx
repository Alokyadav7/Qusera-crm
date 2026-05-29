'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, Eye, Loader2, XCircle, X } from 'lucide-react'

interface Company {
  id: string
  name: string
  status: string
}

interface Props {
  company: Company
}

// ── Suspend modal with reason input ──────────────────────────────────────────

function SuspendModal({
  companyName,
  onConfirm,
  onCancel,
  loading,
}: {
  companyName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <XCircle className="size-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Suspend Company?</p>
            <p className="text-zinc-500 text-xs mt-0.5">{companyName}</p>
          </div>
        </div>

        <p className="text-zinc-400 text-xs leading-relaxed mb-4">
          This will immediately block all users in this company from accessing the CRM.
          A suspension email will be sent to the company admin.
        </p>

        <div className="mb-4">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
            Reason <span className="text-zinc-600 normal-case font-normal">(optional — shown in email)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Payment overdue, Terms of service violation..."
            rows={3}
            className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            Suspend
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main actions bar ──────────────────────────────────────────────────────────

export function CompanyActionsBar({ company }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState(false)

  async function callSuspend(reason: string) {
    setLoading('suspend')
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, reason: reason.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to suspend')
      toast.success(`${company.name} suspended`)
      setShowSuspendModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function callActivate() {
    setLoading('activate')
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to activate')
      toast.success(`${company.name} reactivated`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function callResetTrial() {
    setLoading('reset_trial')
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}/reset_trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to reset trial')
      toast.success('Trial reset')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleImpersonate() {
    setLoading('impersonate')
    try {
      const res = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          reason: `Super Admin access to ${company.name} from Company Detail`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      toast.success(`Now viewing as ${company.name}`)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  const isActive = company.status === 'active' || company.status === 'trial'

  return (
    <>
      {showSuspendModal && (
        <SuspendModal
          companyName={company.name}
          onConfirm={callSuspend}
          onCancel={() => setShowSuspendModal(false)}
          loading={loading === 'suspend'}
        />
      )}

      <div className="flex items-center gap-2">
        {/* Impersonate */}
        <button
          onClick={handleImpersonate}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading === 'impersonate' ? <Loader2 className="size-3 animate-spin" /> : <Eye className="size-3" />}
          View as Company
        </button>

        {/* Suspend / Activate */}
        {isActive ? (
          <button
            onClick={() => setShowSuspendModal(true)}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading === 'suspend' ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
            Suspend
          </button>
        ) : company.status === 'suspended' ? (
          <button
            onClick={callActivate}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading === 'activate' ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
            Reactivate
          </button>
        ) : null}

        {/* Reset Trial */}
        <button
          onClick={callResetTrial}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/50 hover:text-white/70 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading === 'reset_trial' ? <Loader2 className="size-3 animate-spin" /> : <AlertTriangle className="size-3" />}
          Reset Trial
        </button>
      </div>
    </>
  )
}
