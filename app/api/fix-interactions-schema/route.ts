import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Add ai_summary column if it doesn't exist
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE interactions ADD COLUMN IF NOT EXISTS ai_summary text;`
    })

    // If exec_sql RPC doesn't exist, try a direct insert with the column to force schema refresh
    // The real fix: we just skip inserting ai_summary if it fails (handle in voice page)
    if (error) {
      // Fallback: attempt via raw fetch to Supabase SQL endpoint
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
          body: JSON.stringify({ sql: `ALTER TABLE interactions ADD COLUMN IF NOT EXISTS ai_summary text;` }),
        }
      )
      const txt = await res.text()
      return NextResponse.json({ attempted: true, fallback: true, response: txt })
    }

    return NextResponse.json({ success: true, message: 'ai_summary column ensured on interactions table' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
