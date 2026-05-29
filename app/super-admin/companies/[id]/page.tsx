import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { Section, StatCard, StatusBadge } from '@/components/super-admin/ui'
import { CompanyActionsBar } from '@/components/super-admin/company-actions-bar'
import { CompanyCRUDPanel } from '@/components/super-admin/company-crud-panel'
import { FeatureFlagToggles } from '@/components/super-admin/feature-flag-toggles'
import { Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

async function getCompanyDetail(id: string) {
  const svc = createServiceClient()

  const [
    { data: company },
    { data: members },
    { count: leadCount },
    { data: subscription },
    { data: featureOverrides },
    { data: recentEvents },
    { data: usageSummary },
  ] = await Promise.all([
    svc.from('companies').select('*').eq('id', id).single(),
    svc.from('company_members').select('user_id, role, joined_at, is_active').eq('company_id', id).is('deleted_at', null),
    svc.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id).is('deleted_at', null),
    svc.from('subscriptions').select('*, plan:plans(*)').eq('company_id', id).single() as any,
    svc.from('company_feature_overrides').select('*').eq('company_id', id),
    svc.from('activity_events').select('event_type, resource_label, created_at, actor_type').eq('company_id', id).order('created_at', { ascending: false }).limit(20),
    svc.from('usage_summaries').select('metric_key, total_quantity').eq('company_id', id).eq('period_type', 'month').order('period_start', { ascending: false }).limit(10),
  ])

  if (!company) return null

  return {
    company,
    members: members ?? [],
    leadCount: leadCount ?? 0,
    subscription,
    featureOverrides: featureOverrides ?? [],
    recentEvents: recentEvents ?? [],
    usageSummary: usageSummary ?? [],
  }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getCompanyDetail(id)
  if (!data) notFound()

  const { company, members, leadCount, subscription, featureOverrides, recentEvents } = data
  const activeMembers = members.filter((m: any) => m.is_active).length

  return (
    <div className="p-6 xl:p-10 max-w-[1400px] space-y-6">
      {/* Page title row */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            Companies / Detail
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{company.name}</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            {company.slug} · Created {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
          </p>
        </div>
        {/* Existing quick actions: impersonate, suspend/activate, reset trial */}
        <CompanyActionsBar company={company} />
      </div>

      {/* KPI Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Members" value={activeMembers} sub={`${members.length} total`} />
        <StatCard label="Total Leads" value={leadCount} />
        <StatCard label="Plan" value={subscription?.plan?.display_name ?? 'Free'} sub={subscription?.status ?? 'no subscription'} />
        <StatCard label="MRR" value={subscription?.mrr ? `₹${subscription.mrr}` : '₹0'} />
      </div>

      {/* CRUD Panel: Edit company + Members management */}
      <CompanyCRUDPanel company={company} />

      {/* Bottom grid: Feature Flags + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Feature Overrides">
          <FeatureFlagToggles companyId={company.id} overrides={featureOverrides} />
        </Section>

        <Section title="Recent Activity">
          {recentEvents.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-600 text-sm">No activity yet</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentEvents.map((e: any, i: number) => (
                <div key={i} className="px-4 py-2.5">
                  <p className="text-white/60 text-xs">{e.event_type.replace('.', ' · ')}</p>
                  {e.resource_label && <p className="text-white/30 text-[11px]">{e.resource_label}</p>}
                  <p className="text-white/20 text-[11px]">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
