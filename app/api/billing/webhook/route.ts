import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/billing/webhook
// Razorpay sends webhook events here.
// Configure in Razorpay Dashboard → Settings → Webhooks → Add URL
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature') ?? ''
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

    // ── Verify webhook signature ──────────────────────────────
    if (secret) {
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      if (expectedSig !== signature) {
        console.warn('[webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const event = JSON.parse(rawBody)
    const svc = createServiceClient()

    // ── payment.captured → activate subscription ──────────────
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity
      const notes = payment?.notes ?? {}
      const { company_id, plan_id, user_id } = notes

      if (!company_id || !plan_id) {
        return NextResponse.json({ received: true, warning: 'Missing notes' })
      }

      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      // Upsert subscription
      await (svc as any).from('subscriptions').upsert({
        company_id,
        plan_id,
        status: 'active',
        mrr: Math.round(payment.amount / 100),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        updated_at: now.toISOString(),
      }, { onConflict: 'company_id' })

      // Update company status to active
      await svc.from('companies').update({
        status: 'active',
        updated_at: now.toISOString(),
      }).eq('id', company_id)

      // Create invoice record
      await (svc as any).from('invoices').insert({
        company_id,
        amount: payment.amount / 100,
        currency: payment.currency ?? 'INR',
        status: 'paid',
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        paid_at: now.toISOString(),
        created_at: now.toISOString(),
      })

      // Audit log
      await (svc as any).from('activity_events').insert({
        event_type: 'company.plan_changed',
        actor_type: 'system',
        actor_id: user_id ?? null,
        resource_type: 'subscription',
        resource_id: company_id,
        resource_label: `Plan upgraded to ${plan_id}`,
        metadata: { plan_id, amount: payment.amount, payment_id: payment.id },
        created_at: now.toISOString(),
      })

      return NextResponse.json({ received: true, action: 'subscription_activated' })
    }

    // ── payment.failed → mark past_due ────────────────────────
    if (event.event === 'payment.failed') {
      const payment = event.payload?.payment?.entity
      const notes = payment?.notes ?? {}
      const { company_id } = notes

      if (company_id) {
        await (svc as any).from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('company_id', company_id)

        // Activity log for failed payment
        await (svc as any).from('activity_events').insert({
          event_type: 'company.payment_failed',
          actor_type: 'system',
          resource_type: 'subscription',
          resource_id: company_id,
          resource_label: 'Payment failed',
          metadata: { error_code: payment?.error_code, error_description: payment?.error_description },
          created_at: new Date().toISOString(),
        })
      }

      return NextResponse.json({ received: true, action: 'marked_past_due' })
    }

    // All other events — acknowledge receipt
    return NextResponse.json({ received: true, event: event.event })
  } catch (e: any) {
    console.error('[billing/webhook]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
