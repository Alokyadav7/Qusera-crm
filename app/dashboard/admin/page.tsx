'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, Users, CreditCard, Settings, TrendingUp, Loader2,
  CheckCircle2, Circle, Plug, FileText, UserPlus
} from 'lucide-react'
import Link from 'next/link'

interface CompanyStats {
  totalMembers: number
  activeMembers: number
  totalLeads: number
  totalDeals: number
  planName: string
  setupComplete: boolean
  passwordChanged: boolean
  profileComplete: boolean
  teamAdded: boolean
  integrationConnected: boolean
  firstLead: boolean
  firstDeal: boolean
}

export default function CompanyAdminPage() {
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Get company
      const { data: memberData } = await (supabase as any)
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      const cid = memberData?.company_id
      if (!cid) { setLoading(false); return }

      const [
        { data: company },
        { count: totalMembers },
        { count: activeMembers },
        { count: totalLeads },
        { count: totalDeals },
        { data: profile },
        { data: integrations },
      ] = await Promise.all([
        (supabase as any).from('companies').select('name, plan_id, setup_complete').eq('id', cid).single(),
        (supabase as any).from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', cid),
        (supabase as any).from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        (supabase as any).from('deals').select('*', { count: 'exact', head: true }),
        (supabase as any).from('profiles').select('onboarding_completed').eq('id', user.id).single(),
        (supabase as any).from('company_integrations').select('integration_type, is_active').eq('company_id', cid),
      ])

      setCompanyName(company?.name ?? '')
      setStats({
        totalMembers: totalMembers ?? 0,
        activeMembers: activeMembers ?? 0,
        totalLeads: totalLeads ?? 0,
        totalDeals: totalDeals ?? 0,
        planName: company?.plan_id ?? 'basic',
        setupComplete: !!company?.setup_complete,
        passwordChanged: !!profile?.onboarding_completed,
        profileComplete: !!company?.name,
        teamAdded: (totalMembers ?? 0) > 1,
        integrationConnected: (integrations ?? []).some((i: any) => i.is_active),
        firstLead: (totalLeads ?? 0) > 0,
        firstDeal: (totalDeals ?? 0) > 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const statCards = stats ? [
    { label: 'Total Employees', value: stats.totalMembers, icon: Users, href: '/dashboard/admin/team', color: 'text-blue-600' },
    { label: 'Active Members', value: stats.activeMembers, icon: Users, href: '/dashboard/admin/team', color: 'text-emerald-600' },
    { label: 'Total Leads', value: stats.totalLeads, icon: TrendingUp, href: '/dashboard/leads', color: 'text-amber-600' },
    { label: 'Deals', value: stats.totalDeals, icon: CreditCard, href: '/dashboard/deals', color: 'text-violet-600' },
  ] : []

  const quickLinks = [
    { label: 'Add Employee', desc: 'Invite team members', href: '/dashboard/admin/team', icon: UserPlus },
    { label: 'Company Settings', desc: 'Branding, timezone, domain', href: '/dashboard/admin/settings', icon: Settings },
    { label: 'Billing & Plan', desc: 'Subscription, invoices, usage', href: '/dashboard/admin/billing', icon: CreditCard },
    { label: 'Integrations', desc: 'Email, WhatsApp, SMS', href: '/dashboard/admin/integrations', icon: Plug },
    { label: 'Audit Logs', desc: 'Organization activity trail', href: '/dashboard/admin/audit-logs', icon: FileText },
  ]

  const setupChecklist = stats ? [
    { label: 'Password changed', done: stats.passwordChanged },
    { label: 'Company profile complete', done: stats.profileComplete },
    { label: 'Team members added', done: stats.teamAdded },
    { label: 'First integration connected', done: stats.integrationConnected },
    { label: 'First lead created', done: stats.firstLead },
    { label: 'First deal created', done: stats.firstDeal },
  ] : []
  const completedCount = setupChecklist.filter(i => i.done).length

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="size-6" />
          {companyName ? `${companyName} — ` : ''}Company Admin
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your workspace, team, billing and integrations</p>
      </div>

      {loading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(c => (
              <Link key={c.label} href={c.href} className="border rounded-xl p-5 bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <c.icon className={`size-5 ${c.color}`} />
                </div>
                <p className="text-3xl font-bold">{c.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Setup Checklist */}
            {!stats?.setupComplete && (
              <div className="border rounded-xl bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-sm">Onboarding Checklist</p>
                  <span className="text-xs text-muted-foreground">{completedCount}/6 complete</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mb-4">
                  <div
                    className="bg-primary rounded-full h-1.5 transition-all"
                    style={{ width: `${(completedCount / 6) * 100}%` }}
                  />
                </div>
                <ul className="space-y-2.5">
                  {setupChecklist.map(item => (
                    <li key={item.label} className="flex items-center gap-2.5 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Links */}
            <div className="grid gap-2.5">
              {quickLinks.map(l => (
                <Link key={l.href} href={l.href} className="flex items-center gap-4 p-4 border rounded-xl bg-card hover:shadow-md transition-shadow">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <l.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{l.label}</p>
                    <p className="text-xs text-muted-foreground">{l.desc}</p>
                  </div>
                  <span className="ml-auto text-muted-foreground">→</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
