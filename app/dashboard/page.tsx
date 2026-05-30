import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { CRMHeader } from '@/components/crm/crm-header'
import { DashboardStats } from '@/components/crm/dashboard-stats'
import { LeadPriorityList } from '@/components/crm/lead-priority-list'
import { TasksWidget } from '@/components/crm/tasks-widget'
import { RecentInteractions } from '@/components/crm/recent-interactions'
import { VoiceRecorderWidget } from '@/components/crm/voice-recorder-widget'
import { PipelineChart } from '@/components/crm/pipeline-chart'
import { RoutePlannerWidget } from '@/components/crm/route-planner-widget'
import { LiveRevenueCommandCenter } from '@/components/crm/live-revenue-command-center'
import { PersonalNotesWidget } from '@/components/crm/personal-notes-widget'
import Link from 'next/link'

async function getDashboardData() {
  const supabase = createServiceClient()
  const sessionClient = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get current user for scoped queries
  const { data: { user } } = await sessionClient.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return {
      userName: 'User',
      pendingTasks: 0,
      leads: [],
      tasks: [],
      interactions: [],
      stats: { totalLeads: 0, newLeadsToday: 0, tasksToday: 0, completedTasks: 0, totalRevenue: 0, conversionRate: 0 },
      pipelineData: { new: 0, contacted: 0, interested: 0, verified: 0, negotiation: 0, closed_won: 0, closed_lost: 0 }
    }
  }

  // Resolve company_id — all queries MUST be scoped to this company
  const [profileRes, memberRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId as any).single(),
    (supabase as any).from('company_members').select('company_id').eq('user_id', userId).eq('is_active', true).single(),
  ])

  const userName = (profileRes.data as any)?.full_name || 'User'
  const companyId: string | null = memberRes.data?.company_id ?? null

  if (!companyId) {
    return {
      userName,
      pendingTasks: 0,
      leads: [],
      tasks: [],
      interactions: [],
      stats: { totalLeads: 0, newLeadsToday: 0, tasksToday: 0, completedTasks: 0, totalRevenue: 0, conversionRate: 0 },
      pipelineData: { new: 0, contacted: 0, interested: 0, verified: 0, negotiation: 0, closed_won: 0, closed_lost: 0 }
    }
  }

  // All queries scoped to this company only — no cross-tenant data
  const [
    { count: pendingTasks },
    { data: leads },
    { data: pipelineLeads },
    { data: tasks },
    { data: interactions },
    { count: totalLeads },
    { count: newLeadsToday },
    { count: completedTasks },
    { data: closedDeals },
    { count: closedLostCount }
  ] = await Promise.all([
    supabase.from('tasks').select('*', { count: 'exact', head: true })
      .eq('company_id' as any, companyId)
      .eq('is_completed', false)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString()),
    supabase.from('leads').select('*')
      .eq('company_id' as any, companyId)
      .order('sentiment_score', { ascending: false }).limit(10),
    supabase.from('leads').select('status')
      .eq('company_id' as any, companyId),
    supabase.from('tasks').select('*, lead:leads(full_name, company)')
      .eq('company_id' as any, companyId)
      .eq('is_completed', false)
      .order('due_date', { ascending: true })
      .limit(5),
    supabase.from('interactions').select('*, lead:leads(full_name, company)')
      .eq('company_id' as any, companyId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('company_id' as any, companyId),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('company_id' as any, companyId)
      .gte('created_at', today.toISOString()),
    supabase.from('tasks').select('*', { count: 'exact', head: true })
      .eq('company_id' as any, companyId)
      .eq('is_completed', true),
    supabase.from('leads').select('deal_value, estimated_budget, status')
      .eq('company_id' as any, companyId)
      .eq('status', 'closed_won'),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('company_id' as any, companyId)
      .eq('status', 'closed_lost'),
  ])

  const totalRevenue = closedDeals?.reduce((sum, deal) => sum + (Number(deal.deal_value) || Number(deal.estimated_budget) || 0), 0) || 0
  const closedWonCount = closedDeals?.length || 0
  const conversionRate = totalLeads && totalLeads > 0 ? (closedWonCount / totalLeads) * 100 : 0

  const pipelineData = {
    new: pipelineLeads?.filter(l => l.status === 'new').length || 0,
    contacted: pipelineLeads?.filter(l => l.status === 'contacted').length || 0,
    interested: pipelineLeads?.filter(l => l.status === 'interested').length || 0,
    verified: pipelineLeads?.filter(l => l.status === 'verified').length || 0,
    negotiation: pipelineLeads?.filter(l => l.status === 'negotiation').length || 0,
    closed_won: closedWonCount,
    closed_lost: closedLostCount || 0
  }

  return {
    userName,
    pendingTasks: pendingTasks || 0,
    leads: leads || [],
    tasks: tasks || [],
    interactions: interactions || [],
    stats: {
      totalLeads: totalLeads || 0,
      newLeadsToday: newLeadsToday || 0,
      tasksToday: pendingTasks || 0,
      completedTasks: completedTasks || 0,
      totalRevenue,
      conversionRate: Math.round(conversionRate * 10) / 10
    },
    pipelineData
  }
}

function EmptyStateOnboarding({ userName }: { userName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-5xl mb-4">🚀</div>
      <h2 className="text-2xl font-bold mb-2">Welcome to KlinqCRM, {userName}!</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Your workspace is ready. Start by adding your first lead to unlock the full power of AI-driven sales.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          {
            icon: '👤',
            title: 'Add Your First Lead',
            desc: 'Manually enter a lead or use the Quick Add button below',
            href: '/dashboard/leads',
            cta: 'Add Lead →',
            color: 'bg-primary/5 border-primary/20',
          },
          {
            icon: '🎤',
            title: 'Voice to CRM',
            desc: 'Just speak — AI extracts lead details automatically',
            href: '/dashboard/voice',
            cta: 'Try Voice →',
            color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
          },
          {
            icon: '📊',
            title: 'View Your Pipeline',
            desc: 'Drag and drop leads across your sales stages',
            href: '/dashboard/pipeline',
            cta: 'Open Pipeline →',
            color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
          },
        ].map(card => (
          <Link
            key={card.title}
            href={card.href}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border ${card.color} hover:scale-105 transition-transform duration-200 text-center`}
          >
            <span className="text-3xl">{card.icon}</span>
            <div>
              <p className="font-semibold text-sm">{card.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
            </div>
            <span className="text-xs font-medium text-primary">{card.cta}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const hasData = data.stats.totalLeads > 0 || data.tasks.length > 0

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Dashboard"
        subtitle={data.pendingTasks > 0
          ? `Welcome back, ${data.userName}! You have ${data.pendingTasks} pending task${data.pendingTasks === 1 ? '' : 's'} today.`
          : `Welcome back, ${data.userName}! You're all caught up for today.`
        }
      />

      <main className="flex-1 p-4 md:p-6 md:pt-8 space-y-6 max-w-[1600px] mx-auto w-full relative">
        <div className="absolute right-0 top-0 size-96 bg-primary/5 blur-[100px] -z-10 rounded-full" />

        {/* Stats Overview */}
        <DashboardStats stats={data.stats} />

        {/* Empty state for brand new users */}
        {!hasData ? (
          <EmptyStateOnboarding userName={data.userName} />
        ) : (
          <>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
              {/* Row 1: Live Revenue (8 cols) + Voice Recorder (4 cols) */}
              <div className="lg:col-span-8 animate-fade-in-up delay-75">
                <LiveRevenueCommandCenter initialLeads={data.leads as any} initialTasks={data.tasks} />
              </div>
              <div className="lg:col-span-4 animate-fade-in-up delay-100">
                <VoiceRecorderWidget />
              </div>

              {/* Row 2: Priority Leads (4 cols) + Tasks (4 cols) + Recent Interactions (4 cols) */}
              <div className="lg:col-span-4 animate-fade-in-up delay-150">
                <LeadPriorityList leads={data.leads as any} />
              </div>
              <div className="lg:col-span-4 animate-fade-in-up delay-200">
                <TasksWidget tasks={data.tasks} />
              </div>
              <div className="lg:col-span-4 animate-fade-in-up delay-250">
                <RecentInteractions interactions={data.interactions} />
              </div>

              {/* Row 3: Pipeline Chart (5 cols) + Route Planner (4 cols) + Personal Notes (3 cols) */}
              <div className="lg:col-span-5 animate-fade-in-up delay-300">
                <PipelineChart data={data.pipelineData} />
              </div>
              <div className="lg:col-span-4 animate-fade-in-up delay-350">
                <RoutePlannerWidget />
              </div>
              <div className="lg:col-span-3 animate-fade-in-up delay-400">
                <PersonalNotesWidget />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
