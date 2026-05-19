import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * CSV Import API — POST /api/leads/import
 * Accepts JSON array of lead rows (parsed from CSV client-side)
 * Returns { imported, skipped, errors }
 */
export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const REQUIRED = ['full_name']
    const STATUS_VALUES = ['new','contacted','interested','verified','negotiation','closed_won','closed_lost']
    const INTENT_VALUES = ['high','medium','low']

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Process in batches of 50
    const BATCH_SIZE = 50
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const validRows = []

      for (const row of batch) {
        // Validate required fields
        const missing = REQUIRED.filter(f => !row[f]?.toString().trim())
        if (missing.length) {
          errors.push(`Row ${i + batch.indexOf(row) + 2}: Missing ${missing.join(', ')}`)
          skipped++
          continue
        }

        validRows.push({
          user_id: user.id,
          full_name: row.full_name?.toString().trim(),
          phone_number: row.phone_number?.toString().trim() || null,
          email: row.email?.toString().trim().toLowerCase() || null,
          company: row.company?.toString().trim() || null,
          city: row.city?.toString().trim() || null,
          state: row.state?.toString().trim() || null,
          source: row.source?.toString().trim() || 'csv_import',
          status: STATUS_VALUES.includes(row.status) ? row.status : 'new',
          buying_intent: INTENT_VALUES.includes(row.buying_intent) ? row.buying_intent : 'medium',
          estimated_budget: row.estimated_budget ? Number(row.estimated_budget) : null,
          gstin: row.gstin?.toString().trim() || null,
          pan_number: row.pan_number?.toString().trim() || null,
          gst_status: 'pending',
          pan_status: 'pending',
          sentiment_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      if (validRows.length > 0) {
        const { error } = await supabase.from('leads').insert(validRows)
        if (error) {
          errors.push(`Batch error: ${error.message}`)
          skipped += validRows.length
        } else {
          imported += validRows.length
        }
      }
    }

    return NextResponse.json({ success: true, imported, skipped, errors: errors.slice(0, 10) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * CSV Export API — GET /api/leads/import?format=csv
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: leads } = await supabase
    .from('leads')
    .select('full_name,phone_number,email,company,city,state,status,buying_intent,estimated_budget,gst_status,pan_status,source,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!leads?.length) return NextResponse.json({ error: 'No leads to export' }, { status: 404 })

  // Build CSV
  const headers = ['Name','Phone','Email','Company','City','State','Status','Intent','Budget','GST Status','PAN Status','Source','Created At']
  const csvRows = [
    headers.join(','),
    ...(leads || []).map(l => [
      `"${l.full_name || ''}"`,
      `"${l.phone_number || ''}"`,
      `"${l.email || ''}"`,
      `"${l.company || ''}"`,
      `"${l.city || ''}"`,
      `"${l.state || ''}"`,
      l.status,
      l.buying_intent,
      l.estimated_budget || '',
      l.gst_status || 'pending',
      l.pan_status || 'pending',
      `"${l.source || ''}"`,
      `"${new Date(l.created_at).toLocaleDateString('en-IN')}"`,
    ].join(','))
  ]

  const csv = csvRows.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="orbitcrm-leads-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
