'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, Mail, Lock, User, ArrowLeft, Shield, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string

    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: { full_name: name },
        },
      })

      if (error) throw error

      // If email confirmation is disabled (instant login), go to onboarding
      if (data.session) {
        router.push('/onboarding')
        router.refresh()
      } else {
        setSuccess('Check your email for a confirmation link. After confirming, you\'ll be guided through setup.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <header className="p-4 md:p-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Zap className="size-5" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">OrbitCRM</span>
            </Link>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to access your CRM dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 flex-shrink-0" />
                  {success}
                </div>
              )}

              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          id="signin-password"
                          name="password"
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          id="signup-name"
                          name="name"
                          type="text"
                          placeholder="John Doe"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          id="signup-password"
                          name="password"
                          type="password"
                          placeholder="Create a password (min 6 characters)"
                          className="pl-10"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Shield className="size-3" />
                    <span>SSL Secured</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <span>GDPR Compliant</span>
                  <span className="text-slate-300">|</span>
                  <span>SOC 2</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-slate-500 mt-6">
            By signing in, you agree to our{' '}
            <Link href="#" className="underline hover:text-slate-700">Terms of Service</Link>
            {' '}and{' '}
            <Link href="#" className="underline hover:text-slate-700">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
