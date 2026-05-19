'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Dashboard error:', error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-100 mb-4">
        <AlertTriangle className="size-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold mb-2">Page Error</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        {error.message || 'This page hit an error. Your data is safe.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}><RefreshCw className="size-4 mr-2" />Retry</Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>Dashboard</Button>
      </div>
    </div>
  )
}
