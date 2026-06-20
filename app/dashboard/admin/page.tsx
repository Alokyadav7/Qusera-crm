'use client'

import { useEffect, useState } from 'react'
import {
  Building2, Users, CreditCard, Settings, TrendingUp, Loader2,
  CheckCircle2, Circle, Plug, FileText, UserPlus, ShieldAlert,
  ArrowRight, Activity, Clock
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface ActivityLog {
  id: string
  user_email: string
  action: string
  entity_type: string
  created_at: string
}

interface CompanyStats {
  companyName: string
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
  recentActivity: ActivityLog[]
}

export default function CompanyAdminPage() {
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/admin/stats')
      if (!res.ok) {
        throw new Error('Failed to fetch admin stats')
      }
      const data = await res.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="border border-destructive/50 rounded-xl p-6 bg-destructive/5 text-destructive max-w-2xl flex items-start gap-4">
          <ShieldAlert className="size-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg">Error Loading Dashboard</h3>
            <p className="text-sm opacity-90 mt-1">{error || 'Could not load company statistics. Make sure you are logged in as an administrator.'}</p>
            <button onClick={() => { setLoading(true); fetchStats() }} className="mt-4 text-xs font-semibold px-4 py-2 border border-destructive rounded-lg hover:bg-destructive/10 transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Employees', value: stats.totalMembers, icon: Users, href: '/dashboard/admin/team', color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Active Seats', value: stats.activeMembers, icon: Users, href: '/dashboard/admin/team', color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Total Leads', value: stats.totalLeads, icon: TrendingUp, href: '/dashboard/leads', color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Open Deals', value: stats.totalDeals, icon: CreditCard, href: '/dashboard/deals', color: 'text-violet-500 bg-violet-500/10' },
  ]

  const quickLinks = [
    { label: 'Add Employee', desc: 'Invite new team members', href: '/dashboard/admin/team', icon: UserPlus },
    { label: 'Company Settings', desc: 'Profile, billing address, tax details', href: '/dashboard/admin/company-settings', icon: Settings },
    { label: 'Integrations', desc: 'Connect Email, WhatsApp & SMS', href: '/dashboard/admin/integrations', icon: Plug },
    { label: 'Audit Logs', desc: 'Organization activity logs', href: '/dashboard/admin/audit-logs', icon: FileText },
    { label: 'Billing & Plan', desc: 'Plan status and upgrades', href: '/dashboard/admin/billing', icon: CreditCard },
  ]

  const setupChecklist = [
    { label: 'Change temporary password', done: stats.passwordChanged },
    { label: 'Complete company profile details', done: stats.profileComplete },
    { label: 'Add team members', done: stats.teamAdded },
    { label: 'Connect an communication integration', done: stats.integrationConnected },
    { label: 'Create your first lead', done: stats.firstLead },
    { label: 'Create your first deal', done: stats.firstDeal },
  ]

  const completedCount = setupChecklist.filter(i => i.done).length
  const progressPercent = Math.round((completedCount / setupChecklist.length) * 100)

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'team.member_invited': return 'invited a new team member'
      case 'team.member_reactivated': return 'reactivated team member'
      case 'team.member_deactivated': return 'deactivated team member'
      case 'team.member_removed': return 'removed team member'
      case 'team.role_updated': return 'updated team member role'
      case 'company.created': return 'completed company setup'
      case 'integration.connected': return 'connected a new integration'
      case 'lead.created': return 'created a new lead'
      case 'deal.created': return 'created a new deal'
      default: return action.replace(/\./g, ' ')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Building2 className="size-8 text-primary shrink-0" />
            {stats.companyName ? `${stats.companyName} Workspace` : 'Company Admin Panel'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Workspace configurations, team operations, integrations, and compliance auditing</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold capitalize bg-primary/10 text-primary hover:bg-primary/15 border-0">
            {stats.planName} Plan
          </Badge>
          {stats.setupComplete ? (
            <Badge variant="outline" className="px-3 py-1 text-xs font-semibold text-emerald-600 border-emerald-500/20 bg-emerald-500/5">
              Setup Active
            </Badge>
          ) : (
            <Badge variant="outline" className="px-3 py-1 text-xs font-semibold text-amber-600 border-amber-500/20 bg-amber-500/5 animate-pulse">
              Onboarding Active
            </Badge>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <Link key={i} href={c.href}>
            <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group h-full">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{c.label}</p>
                  <p className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">{c.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${c.color} transition-transform group-hover:scale-110`}>
                  <c.icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Quick Actions and Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Onboarding Checklist */}
          {!stats.setupComplete && (
            <Card className="border-amber-500/20 bg-amber-500/[0.02]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">Workspace Onboarding</CardTitle>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-500">{completedCount} of {setupChecklist.length} steps completed</span>
                </div>
                <CardDescription className="text-amber-700/80 dark:text-amber-400/85">Complete these setup steps to launch your CRM workspace for your team.</CardDescription>
                <div className="pt-2">
                  <Progress value={progressPercent} className="h-2 bg-amber-200/50 dark:bg-amber-950/50" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {setupChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/60 backdrop-blur-sm border-border/50">
                      {item.done ? (
                        <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground/30 shrink-0" />
                      )}
                      <span className={`text-xs font-medium ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Quick Configurations</CardTitle>
              <CardDescription>Configure user provisioning, company assets, billing statements, and communications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickLinks.map((l, i) => (
                  <Link key={i} href={l.href}>
                    <div className="flex items-center gap-4 p-4 border border-border/55 rounded-xl hover:bg-muted/40 hover:border-primary/20 transition-all group cursor-pointer h-full">
                      <div className="p-2.5 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                        <l.icon className="size-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm group-hover:text-primary transition-colors">{l.label}</p>
                        <p className="text-xs text-muted-foreground leading-normal">{l.desc}</p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Section - Recent Activity */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary shrink-0" />
                <CardTitle className="text-base font-bold">Recent Activities</CardTitle>
              </div>
              <CardDescription>Last 10 administrative operations</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {stats.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="size-8 mb-2 opacity-30 animate-pulse" />
                  <p className="text-xs">No admin logs recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentActivity.map((log) => (
                    <div key={log.id} className="flex gap-3 text-xs leading-normal pb-3 border-b last:border-0 border-border/40">
                      <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-foreground dark:text-zinc-200">
                          <span className="text-primary font-semibold truncate block max-w-full sm:inline">{log.user_email}</span>{' '}
                          {getActionLabel(log.action)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5">
                          <Badge variant="outline" className="px-1.5 py-0 text-[9px] uppercase border-border/50 text-muted-foreground">
                            {log.entity_type}
                          </Badge>
                          <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
