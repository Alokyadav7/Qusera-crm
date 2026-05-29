'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ImpersonationBanner() {
  const [sessionData, setSessionData] = useState<{ companyName?: string } | null>(null)
  const [ending, setEnding] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if impersonation is active via a lightweight API call
    fetch('/api/super-admin/impersonate/status')
      .then(r => r.json())
      .then(d => {
        if (d.active) setSessionData({ companyName: d.companyName })
      })
      .catch(() => {}) // Not a critical path
  }, [])

  async function endImpersonation() {
    setEnding(true)
    try {
      const res = await fetch('/api/super-admin/impersonate/end', { method: 'POST' })
      if (res.ok) {
        toast.success('Impersonation ended. Returning to Super Admin…')
        router.push('/super-admin')
      } else {
        toast.error('Failed to end impersonation')
      }
    } finally {
      setEnding(false)
    }
  }

  if (!sessionData) return null

  return (
    // Cannot be dismissed — always visible during impersonation
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-black">
      <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Super Admin Mode — You are viewing as{' '}
            <strong>{sessionData.companyName ?? 'a company'}</strong>.
            All actions are logged.
          </span>
        </div>
        <button
          onClick={endImpersonation}
          disabled={ending}
          className="flex items-center gap-1.5 bg-black/10 hover:bg-black/20 text-black text-xs font-medium px-3 py-1 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <X className="size-3.5" />
          {ending ? 'Ending…' : 'Exit Impersonation'}
        </button>
      </div>
    </div>
  )
}
