import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { PageHeader, Section, StatCard, StatusBadge } from '@/components/super-admin/ui'
import { CompanyActionsBar } from '@/components/super-admin/company-actions-bar'
import { FeatureFlagToggles } from '@/components/super-admin/feature-flag-toggles'
import { Users, Activity, CreditCard, Settings } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

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

  return { company, members: members ?? [], leadCount: leadCount ?? 0, subscription, featureOverrides: featureOverrides ?? [], recentEvents: recentEvents ?? [], usageSummary: usageSummary ?? [] }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getCompanyDetail(id)
  if (!data) notFound()

  const { company, members, leadCount, subscription, featureOverrides, recentEvents, usageSummary } = data
  const activeMembers = members.filter(m => m.is_active).length

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-white text-lg font-semibold">{company.name}</h1>
            <StatusBadge
              label={company.status}
              variant={company.status === 'active' ? 'green' : company.status === 'trial' ? 'yellow' : company.status === 'suspended' ? 'red' : 'gray'}
            />
          </div>
          <p className="text-white/35 text-sm">{company.slug} · Created {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}</p>
        </div>
        <CompanyActionsBar company={company} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Active Members" value={activeMembers} sub={`${members.length} total`} />
        <StatCard label="Total Leads" value={leadCount} />
        <StatCard label="Plan" value={subscription?.plan?.display_name ?? 'Free'} sub={subscription?.status ?? 'no subscription'} />
        <StatCard label="MRR" value={subscription?.mrr ? `₹${subscription.mrr}` : '₹0'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Members */}
        <Section title="Team Members" className="lg:col-span-1">
          {members.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/25 text-sm">No members</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {members.slice(0, 8).map((m, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-white/10 flex items-center justify-center">
                      <Users className="size-3 text-white/40" />
                    </div>
                    <span className="text-white/60 text-xs font-mono">{m.user_id.slice(0, 8)}…</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={m.role} variant="gray" />
                    {!m.is_active && <StatusBadge label="inactive" variant="red" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Feature Flags */}
        <Section title="Feature Overrides" className="lg:col-span-1">
          <FeatureFlagToggles companyId={company.id} overrides={featureOverrides} />
        </Section>

        {/* Activity */}
        <Section title="Recent Activity" className="lg:col-span-1">
          {recentEvents.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/25 text-sm">No activity</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {recentEvents.map((e, i) => (
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
