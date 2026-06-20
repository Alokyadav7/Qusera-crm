import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'

export const POST = withTenantAuth(
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json()
      const { planId } = body

      if (!planId) {
        return NextResponse.json({ error: 'planId is required' }, { status: 400 })
      }

      const svc = createServiceClient()

      // Fetch company name
      const { data: company } = await svc
        .from('companies')
        .select('name')
        .eq('id', ctx.companyId)
        .single()

      const companyName = company?.name ?? 'Unknown Company'

      // Email template configuration
      const mailOptions = {
        to: 'klinqcrm@gmail.com',
        subject: `Plan Upgrade Request: ${companyName}`,
        text: `Hello Klinq Support,

We have received a new subscription plan upgrade request:

Company Name: ${companyName}
Company ID: ${ctx.companyId}
Requester Name: ${ctx.userEmail}
Requested Plan: ${planId.toUpperCase()}

Please review this request and contact the administrator to finalize details.

Best regards,
Klinq CRM Notification System`,
        html: `<p>Hello Klinq Support,</p>
<p>We have received a new subscription plan upgrade request:</p>
<ul>
  <li><strong>Company Name:</strong> ${companyName}</li>
  <li><strong>Company ID:</strong> ${ctx.companyId}</li>
  <li><strong>Requester Name:</strong> ${ctx.userEmail}</li>
  <li><strong>Requested Plan:</strong> ${planId.toUpperCase()}</li>
</ul>
<p>Please review this request and contact the administrator to finalize details.</p>
<p>Best regards,<br/>Klinq CRM Notification System</p>`,
      }

      // Send the email
      await sendEmail(mailOptions)

      // Audit Log
      await logAudit({
        req,
        supabase: svc,
        companyId: ctx.companyId,
        userId: ctx.userId,
        userEmail: ctx.userEmail ?? '',
        action: 'billing.upgrade_requested',
        entityType: 'subscription',
        entityId: ctx.companyId,
        oldValue: { planId },
        newValue: { status: 'upgrade_requested' }
      })

      return NextResponse.json({ success: true, message: 'Upgrade request email sent to Klinq support successfully!' })
    } catch (err: any) {
      console.error('[Billing Upgrade Request Error]:', err)
      return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
    }
  },
  { requiredRoles: ['owner', 'admin'] }
)
