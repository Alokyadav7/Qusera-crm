import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="size-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            Something went wrong during the authentication process. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <Link href="/login">Try Again</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
