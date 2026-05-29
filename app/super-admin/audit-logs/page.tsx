import { createServiceClient } from '@/lib/supabase/service'
import { PageHeader } from '@/components/super-admin/ui'
import { format } from 'date-fns'
import { Suspense } from 'react'
import { AuditLogsFilters } from './audit-logs-filters'
import { Calendar, Shield, Terminal } from 'lucide-react'

async function getAuditLogs(searchParams: { company?: string; action?: string; from?: string; to?: string }) {
  const svc = createServiceClient()

  let query = (svc as any)
    .from('audit_logs')
    .select('id, action, resource, user_id, details, created_at, company_id, companies:company_id(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (searchParams.company) {
    query = query.eq('company_id', searchParams.company)
  }
  if (searchParams.action) {
    query = query.eq('action', searchParams.action)
  }
  if (searchParams.from) {
    query = query.gte('created_at', searchParams.from)
  }
  if (searchParams.to) {
    query = query.lte('created_at', searchParams.to + 'T23:59:59Z')
  }

  const { data: logs } = await query

  // Get companies for filter dropdown
  const { data: companies } = await svc.from('companies').select('id, name').is('deleted_at', null).order('name')

  // Get unique actions
  const { data: allLogs } = await (svc as any).from('audit_logs').select('action')
  const uniqueActions = [...new Set((allLogs ?? []).map((l: any) => l.action))] as string[]

  return { logs: logs ?? [], companies: companies ?? [], uniqueActions }
}

export default async function SuperAdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; action?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const { logs, companies, uniqueActions } = await getAuditLogs(sp)

  const ACTION_COLOR: Record<string, string> = {
    'company.onboarded': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase',
    'company.suspended': 'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase',
    'company.activated': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase',
    'company.deleted': 'bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase',
    'user.invited': 'bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase',
    'user.deactivated': 'bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase',
  }

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[1500px] relative overflow-hidden">
      {/* Decorative ambient backgrounds */}
      <div className="absolute right-[5%] top-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.02] blur-[140px] pointer-events-none" />
      <div className="absolute left-[15%] bottom-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/[0.01] blur-[160px] pointer-events-none" />

      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-6 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
          <Shield className="size-3 text-violet-400" />
          <span>Security & Events</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight font-display">
          Audit Trail Logs
        </h1>
        <p className="text-zinc-500 text-xs mt-1">
          Historical log records, configuration changes, instance events and tenant system activity
        </p>
      </div>

      <div className="relative z-10">
        <Suspense fallback={<div className="h-20 bg-zinc-900/35 border border-zinc-800 rounded-2xl animate-pulse mb-6" />}>
          <AuditLogsFilters
            companies={companies as any[]}
            uniqueActions={uniqueActions}
            logs={logs as any[]}
          />
        </Suspense>
      </div>

      {/* Audit Logs Table Glass Panel */}
      <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden relative z-10">
        {logs.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-sm font-light">
            <Terminal className="size-12 text-zinc-650 mb-3 mx-auto opacity-70" />
            <p className="text-zinc-400 font-bold">No entries found</p>
            <p className="text-zinc-650 text-xs mt-1">Clear filters or retry scanning the system ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/20 text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Tenant Scope</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Target Resource</th>
                  <th className="px-6 py-4">Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                    {/* Timestamp */}
                    <td className="px-6 py-4.5 text-zinc-450 text-xs font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-zinc-500" />
                        <span>{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}</span>
                      </div>
                    </td>

                    {/* Scope */}
                    <td className="px-6 py-4.5 text-zinc-350 text-xs font-semibold">
                      {(log.companies as any)?.name ?? (log.company_id ? log.company_id.slice(0, 8) + '…' : 'Platform System')}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4.5">
                      <span className={ACTION_COLOR[log.action] ?? 'bg-zinc-800 text-zinc-450 border border-zinc-700 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase'}>
                        {log.action}
                      </span>
                    </td>

                    {/* Resource */}
                    <td className="px-6 py-4.5 text-zinc-300 text-xs font-mono">
                      {log.resource}
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4.5 text-zinc-500 text-[11px] font-mono max-w-xs truncate group-hover:text-zinc-400 transition-colors">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details ?? '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
