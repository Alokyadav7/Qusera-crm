import { createServiceClient } from '@/lib/supabase/service'
import { PageHeader, Section, StatCard, StatusBadge } from '@/components/super-admin/ui'
import { formatDistanceToNow } from 'date-fns'
import { Briefcase, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'

async function getSupportData() {
  const svc = createServiceClient()
  const [
    { data: activeSessions },
    { data: pendingJobs },
    { data: failedJobs },
    { count: doneJobs },
  ] = await Promise.all([
    svc.from('impersonation_sessions').select('*, company:companies(name)').is('ended_at', null).order('started_at', { ascending: false }),
    svc.from('job_queue').select('*').eq('status', 'pending').order('priority', { ascending: false }).limit(20),
    svc.from('job_queue').select('*').eq('status', 'failed').order('created_at', { ascending: false }).limit(20),
    svc.from('job_queue').select('*', { count: 'exact', head: true }).eq('status', 'done'),
  ])

  return {
    activeSessions: activeSessions ?? [],
    pendingJobs: pendingJobs ?? [],
    failedJobs: failedJobs ?? [],
    doneJobs: doneJobs ?? 0,
  }
}

export default async function SupportPage() {
  const data = await getSupportData()

  return (
    <div className="p-6 max-w-[1400px]">
      <PageHeader
        title="Support & Operations"
        subtitle="Active impersonations, job queue, and platform health"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Impersonations" value={data.activeSessions.length} changeType={data.activeSessions.length > 0 ? 'down' : 'neutral'} />
        <StatCard label="Pending Jobs" value={data.pendingJobs.length} />
        <StatCard label="Failed Jobs" value={data.failedJobs.length} changeType={data.failedJobs.length > 0 ? 'down' : 'neutral'} />
        <StatCard label="Completed Jobs" value={data.doneJobs} changeType="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Impersonations */}
        <Section title="Active Impersonation Sessions">
          {data.activeSessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/25 text-sm">No active impersonations</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {data.activeSessions.map(session => (
                <div key={session.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/80 text-sm">{(session.company as any)?.name ?? 'Unknown'}</p>
                    <StatusBadge label="ACTIVE" variant="yellow" />
                  </div>
                  <p className="text-white/35 text-xs">{session.reason}</p>
                  <p className="text-white/20 text-[11px] mt-0.5">
                    Started {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Failed Jobs */}
        <Section title="Failed Jobs">
          {data.failedJobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/25 text-sm flex flex-col items-center gap-2">
              <CheckCircle className="size-6 text-emerald-500/40" />
              <span>No failed jobs</span>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {data.failedJobs.map(job => (
                <div key={job.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/70 text-xs font-mono">{job.job_type}</p>
                    <div className="flex items-center gap-1 text-white/25 text-[11px]">
                      <RefreshCw className="size-2.5" />
                      {job.attempts}/{job.max_attempts}
                    </div>
                  </div>
                  {job.last_error && (
                    <p className="text-red-400/70 text-[11px] truncate">{job.last_error}</p>
                  )}
                  <p className="text-white/20 text-[11px]">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Pending Jobs */}
        <Section title="Pending Jobs" className="lg:col-span-2">
          {data.pendingJobs.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/25 text-sm">Queue is clear</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Type', 'Priority', 'Attempts', 'Scheduled', 'Company'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[11px] text-white/25 font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.pendingJobs.map(job => (
                  <tr key={job.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs text-white/60 font-mono">{job.job_type}</td>
                    <td className="px-4 py-2.5"><StatusBadge label={`P${job.priority}`} variant={job.priority >= 8 ? 'yellow' : 'gray'} /></td>
                    <td className="px-4 py-2.5 text-xs text-white/40">{job.attempts}/{job.max_attempts}</td>
                    <td className="px-4 py-2.5 text-xs text-white/40">{formatDistanceToNow(new Date(job.scheduled_at), { addSuffix: true })}</td>
                    <td className="px-4 py-2.5 text-xs text-white/30 font-mono">{job.company_id?.slice(0, 8) ?? 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  )
}
