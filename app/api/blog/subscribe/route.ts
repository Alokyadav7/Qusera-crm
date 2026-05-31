import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Save to DB
    const supabase = createServiceClient()
    const { error: dbError } = await supabase.from('blog_subscribers').insert({
      email
    } as any)

    if (dbError) {
      // If code is 23505 (Unique violation) in Postgres
      if ((dbError as any).code === '23505') {
        return NextResponse.json({ success: true, message: 'Already subscribed' })
      }
      console.error('Database subscribe failed:', dbError)
      return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Subscribe API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
