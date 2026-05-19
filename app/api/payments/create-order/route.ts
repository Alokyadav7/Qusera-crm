import { NextRequest, NextResponse } from 'next/server'

/**
 * Razorpay Payment Order Creation
 * POST /api/payments/create-order
 * Body: { amount: number (paise), currency?: string, planId: string, userId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'INR', planId, userId, notes } = await req.json()

    if (!amount || !planId) {
      return NextResponse.json({ error: 'Missing: amount, planId' }, { status: 400 })
    }

    const KEY_ID = process.env.RAZORPAY_KEY_ID
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

    if (!KEY_ID || KEY_ID.startsWith('rzp_test_replace') || !KEY_SECRET || KEY_SECRET.startsWith('replace')) {
      // Mock order for dev
      return NextResponse.json({
        success: true, mock: true,
        orderId: `mock_order_${Date.now()}`,
        amount, currency,
        message: 'Mock order (add RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET to .env for real payments)',
      })
    }

    // Create real Razorpay order
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount, // in paise (e.g. ₹499 = 49900)
        currency,
        receipt: `rcpt_${Date.now()}`,
        notes: { planId, userId, ...notes },
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.description || 'Order creation failed' }, { status: res.status })

    return NextResponse.json({ success: true, orderId: data.id, amount: data.amount, currency: data.currency })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
