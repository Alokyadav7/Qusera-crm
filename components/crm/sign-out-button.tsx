'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // Even if the request fails, clear local state and redirect
    }
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="block text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 mx-auto"
    >
      {loading ? 'Signing out…' : '← Back to login'}
    </button>
  )
}
