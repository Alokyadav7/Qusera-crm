export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { ReportsPageClient } from './reports-client'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ReportsPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()

  // Fetch company membership and role
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const companyId = member?.company_id ?? null
  const role = member?.role ?? null

  if (!companyId) {
    redirect('/dashboard')
  }

  // Gating constraint check: Sales reps and general agents do not get access
  const isManagerOrAdmin = role && ['owner', 'admin', 'manager'].includes(role)
  if (!isManagerOrAdmin) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md border-destructive/20 bg-destructive/[0.01]">
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <ShieldAlert className="size-8 text-destructive" />
            <div>
              <CardTitle className="text-base font-bold text-destructive">Access Restricted</CardTitle>
              <CardDescription>Reports are gated by role permissions</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-normal">
              Sales representatives and general viewers do not have permission to view organizational reports and aggregate analytics dashboards.
            </p>
            <form action={async () => {
              'use server'
              redirect('/dashboard')
            }}>
              <Button size="sm" type="submit" className="w-full">
                Return to Workspace Home
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch only this company's statistics
  const [
    { data: reports },
    { data: leads },
    { data: deals },
  ] = await Promise.all([
    (svc as any).from('saved_reports').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    svc.from('leads').select('buying_intent, deal_value, status, source').eq('company_id' as any, companyId),
    (svc as any).from('deals').select('stage, value, probability').eq('company_id', companyId),
  ])

  return (
    <ReportsPageClient
      initialReports={reports ?? []}
      leads={leads ?? []}
      deals={deals ?? []}
    />
  )
}
