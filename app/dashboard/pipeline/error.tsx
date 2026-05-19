'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <AlertTriangle className="size-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">Pipeline error</h2>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">{error.message || 'Failed to load pipeline.'}</p>
      <div className="flex gap-3"><Button onClick={reset}><RefreshCw className="size-4 mr-2" />Retry</Button><Button variant="outline" onClick={() => location.href='/dashboard'}>Dashboard</Button></div>
    </div>
  )
}
