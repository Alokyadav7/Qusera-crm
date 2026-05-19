'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body className="font-sans antialiased">
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex size-20 items-center justify-center rounded-full bg-red-100 mx-auto">
              <AlertTriangle className="size-10 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground mt-2">
                {error.message || 'An unexpected error occurred. Our team has been notified.'}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">Error ID: {error.digest}</p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={reset} variant="default">
                <RefreshCw className="size-4 mr-2" />Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                <Home className="size-4 mr-2" />Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
