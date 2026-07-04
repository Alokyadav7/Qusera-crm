import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── FIX W1: Use service client and add explicit company_id filter.
    // Defence-in-depth — RLS alone is not sufficient if policies drift.
    const svc = createServiceClient()

    const { data: uac } = await (svc as any)
      .from('user_active_company')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    const companyId = (uac as any)?.company_id as string | null

    if (!companyId) {
      return NextResponse.json(
        { error: 'No active company found. Please complete onboarding.' },
        { status: 400 }
      )
    }

    // Fetch leads scoped to this company only
    const { data: leads, error } = await (svc as any)
      .from('leads')
      .select('*')
      .eq('company_id', companyId)      // ← explicit tenant isolation
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const headers = [
      'Full Name', 'Phone', 'Email', 'Company', 'Status', 'Buying Intent',
      'Source', 'City', 'State', 'Deal Value (₹)', 'Estimated Budget (₹)',
      'Sentiment Score', 'GST Status', 'PAN Status', 'AI Summary',
      'Last Contacted', 'Created At'
    ]

    if (!leads || leads.length === 0) {
      const csv = headers.join(',') + '\n'
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="KlinqCRM-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    const escape = (val: string | number | boolean | null | undefined): string => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = leads.map((lead: any) => {
      const l = lead as any
      return [
        escape(l.full_name),
        escape(l.phone || l.phone_number),
        escape(l.email),
        escape(l.company),
        escape(l.status),
        escape(l.buying_intent),
        escape(l.source),
        escape(l.city),
        escape(l.state),
        escape(l.deal_value),
        escape(l.estimated_budget),
        escape(l.sentiment_score),
        escape(l.gst_status),
        escape(l.pan_status),
        escape(l.ai_summary),
        escape(l.last_contacted_at),
        escape(l.created_at),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="KlinqCRM-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    console.error('CSV export error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
