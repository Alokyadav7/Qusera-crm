import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Plan pricing map — keep in sync with your plans table
const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  pro:        { amount: 299900, name: 'Klinq Pro' },        // ₹2,999 in paise
  enterprise: { amount: 999900, name: 'Klinq Enterprise' }, // ₹9,999 in paise
}

// POST /api/billing/create-order
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { plan_id, company_id } = body

    if (!plan_id || !company_id) {
      return NextResponse.json({ error: 'Missing plan_id or company_id' }, { status: 400 })
    }

    // Verify caller belongs to this company
    const svc = createServiceClient()
    const { data: member } = await svc
      .from('company_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden: owner or admin role required' }, { status: 403 })
    }

    // Resolve plan price
    const plan = PLAN_PRICES[plan_id.toLowerCase()]
    if (!plan) {
      return NextResponse.json({ error: `Unknown plan: ${plan_id}` }, { status: 400 })
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: 'INR',
      receipt: `Klinq_${company_id.slice(0, 8)}_${Date.now()}`,
      notes: {
        company_id,
        plan_id,
        user_id: user.id,
      },
    })

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan_name: plan.name,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (e: any) {
    console.error('[billing/create-order]', e)
    return NextResponse.json({ error: e.message ?? 'Failed to create order' }, { status: 500 })
  }
}
