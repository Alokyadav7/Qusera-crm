import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { CompanyDetailClient } from './company-detail-client'

export const dynamic = 'force-dynamic'

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
    svc.from('company_members').select('user_id, role, joined_at, is_active, profile:profiles(full_name, email)').eq('company_id', id).is('deleted_at', null),
    svc.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id).is('deleted_at', null),
    svc.from('subscriptions').select('*, plan:plans(*)').eq('company_id', id).maybeSingle() as any,
    svc.from('company_feature_overrides').select('*').eq('company_id', id),
    svc.from('activity_events').select('event_type, resource_label, created_at, actor_type').eq('company_id', id).order('created_at', { ascending: false }).limit(200),
    svc.from('usage_summaries').select('metric_key, total_quantity').eq('company_id', id).eq('period_type', 'month').order('period_start', { ascending: false }).limit(10),
  ])

  if (!company) return null

  return {
    company: company as any,
    members: (members ?? []).map(m => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      is_active: m.is_active,
      profile: m.profile as any
    })),
    leadCount: leadCount ?? 0,
    subscription: subscription as any,
    featureOverrides: (featureOverrides ?? []).map(o => ({
      id: o.id,
      feature_key: o.feature_key,
      is_enabled: o.is_enabled
    })),
    recentEvents: (recentEvents ?? []).map(e => ({
      event_type: e.event_type,
      resource_label: e.resource_label ?? '',
      actor_type: e.actor_type,
      created_at: e.created_at
    })),
    usageSummary: (usageSummary ?? []).map(u => ({
      metric_key: u.metric_key,
      total_quantity: Number(u.total_quantity) || 0
    })),
  }
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getCompanyDetail(id)
  if (!data) notFound()

  return (
    <CompanyDetailClient
      company={data.company}
      members={data.members}
      leadCount={data.leadCount}
      subscription={data.subscription}
      featureOverrides={data.featureOverrides}
      recentEvents={data.recentEvents}
      usageSummary={data.usageSummary}
    />
  )
}
