import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/middleware/withSuperAdmin'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/super-admin/companies/[id]/usage
export const GET = withSuperAdmin(async (req: NextRequest, _adminId: string) => {
  const id = req.nextUrl.pathname.split('/').at(-2)! // /api/super-admin/companies/[id]/usage
  const svc = createServiceClient()
  const now = new Date()

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    { count: leadsThis },
    { count: leadsLast },
    { count: loginsThis },
    { count: loginsLast },
    { count: emailsThis },
    { count: emailsLast },
    { count: smsThis },
    { count: smsLast },
    { count: whatsappThis },
    { count: whatsappLast },
  ] = await Promise.all([
    svc.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id).gte('created_at', thisMonthStart).is('deleted_at', null),
    svc.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd).is('deleted_at', null),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'user.login_success').gte('created_at', thisMonthStart),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'user.login_success').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'email.sent').gte('created_at', thisMonthStart),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'email.sent').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'sms.sent').gte('created_at', thisMonthStart),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'sms.sent').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'whatsapp.sent').gte('created_at', thisMonthStart),
    svc.from('audit_logs').select('*', { count: 'exact', head: true }).eq('company_id', id).eq('action', 'whatsapp.sent').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
  ])

  function pctChange(curr: number, prev: number): string {
    if (prev === 0) return curr > 0 ? '+100%' : '—'
    const pct = Math.round(((curr - prev) / prev) * 100)
    return pct >= 0 ? `+${pct}%` : `${pct}%`
  }

  const metrics = [
    { label: 'Leads Created',  thisMonth: leadsThis ?? 0,    lastMonth: leadsLast ?? 0 },
    { label: 'Logins',         thisMonth: loginsThis ?? 0,   lastMonth: loginsLast ?? 0 },
    { label: 'Emails Sent',    thisMonth: emailsThis ?? 0,   lastMonth: emailsLast ?? 0 },
    { label: 'SMS Sent',       thisMonth: smsThis ?? 0,      lastMonth: smsLast ?? 0 },
    { label: 'WhatsApp Sent',  thisMonth: whatsappThis ?? 0, lastMonth: whatsappLast ?? 0 },
  ].map(m => ({
    ...m,
    change: pctChange(m.thisMonth, m.lastMonth),
    up: m.thisMonth >= m.lastMonth,
  }))

  return NextResponse.json({ metrics })
})
