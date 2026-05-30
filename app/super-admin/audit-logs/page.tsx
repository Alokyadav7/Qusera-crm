import { createServiceClient } from '@/lib/supabase/service'
import { format } from 'date-fns'
import { Suspense } from 'react'
import { AuditLogsFilters } from './audit-logs-filters'
import { Calendar, Shield, Terminal } from 'lucide-react'

export const dynamic = 'force-dynamic'

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
    'company.onboarded': 'text-emerald-405 border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
    'company.suspended': 'text-red-405 border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
    'company.activated': 'text-emerald-405 border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
    'company.deleted': 'text-red-405 border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
    'user.invited': 'text-zinc-300 border-zinc-800 bg-zinc-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
    'user.deactivated': 'text-red-405 border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
  }

  return (
    <div className="p-6 xl:p-10 space-y-6 max-w-[1600px] bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">
      
      {/* Header Panel */}
      <div className="border-b border-zinc-900 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2 select-none">
          <Shield className="size-3 text-zinc-350" />
          <span>Platform Trail</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight font-display select-none">
          Audit Logs Ledger
        </h1>
        <p className="text-zinc-500 text-xs mt-0.5">
          Comprehensive, non-repudiation ledger recording system mutations, settings overrides, and tenant context switches
        </p>
      </div>

      <div>
        <Suspense fallback={<div className="h-14 bg-zinc-950 border border-zinc-900 rounded animate-pulse" />}>
          <AuditLogsFilters
            companies={companies as any[]}
            uniqueActions={uniqueActions}
            logs={logs as any[]}
          />
        </Suspense>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Terminal className="size-10 text-zinc-600 mx-auto opacity-70" />
            <p className="text-zinc-400 text-xs font-bold font-mono">No trail logs matched query bounds</p>
            <p className="text-zinc-650 text-[11px]">Adjust criteria filters or reset parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/5 text-[9px] font-bold text-zinc-550 tracking-wider uppercase">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Tenant Scope</th>
                  <th className="px-5 py-3">Event Action</th>
                  <th className="px-5 py-3">Target Resource</th>
                  <th className="px-5 py-3">Log Details Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-zinc-900/10 transition-colors group">
                    {/* Timestamp */}
                    <td className="px-5 py-3.5 text-zinc-500 text-xs font-mono whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-zinc-650" />
                        <span>{format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}</span>
                      </div>
                    </td>

                    {/* Scope */}
                    <td className="px-5 py-3.5 text-zinc-300 text-xs font-bold">
                      {(log.companies as any)?.name ?? (log.company_id ? log.company_id.slice(0, 8) + '…' : 'System Node')}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5">
                      <span className={ACTION_COLOR[log.action] ?? 'text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider'}>
                        {log.action}
                      </span>
                    </td>

                    {/* Resource */}
                    <td className="px-5 py-3.5 text-zinc-400 text-xs font-mono">
                      {log.resource}
                    </td>

                    {/* Details */}
                    <td className="px-5 py-3.5 text-zinc-550 text-[10.5px] font-mono max-w-sm truncate group-hover:text-zinc-400 transition-colors">
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
