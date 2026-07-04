import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/cron/daily
 * Runs daily at 9am IST via Supabase Edge Function cron.
 * Tasks:
 *   1. Mark overdue invoices
 *   2. Send task due-soon notifications  
 *   3. Decay lead scores for inactive leads (no activity 7+ days)
 *   4. Auto-refresh expiring WhatsApp Business API tokens (within 7 days of expiry)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const results: Record<string, number> = {}

  // ── 1. Mark overdue invoices ──────────────────────────────────────────────
  const { count: overdueCount } = await (supabase as any)
    .from('crm_invoices')
    .update({ status: 'overdue' })
    .eq('status', 'sent')
    .lt('due_date', today)
    .select('id', { count: 'exact', head: true })
  results.invoices_marked_overdue = overdueCount ?? 0

  // ── 2. Task due-soon notifications (due within 24h) ───────────────────────
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString()
  const { data: dueTasks } = await (supabase as any)
    .from('tasks')
    .select('id, title, assigned_to, company_id, due_date')
    .eq('status', 'pending')
    .lte('due_date', tomorrow)
    .gte('due_date', now.toISOString())
    .limit(200)

  if (dueTasks?.length) {
    const notifs = (dueTasks as any[]).map(t => ({
      company_id: t.company_id,
      user_id: t.assigned_to,
      title: `Task due soon: ${t.title}`,
      body: `Due ${new Date(t.due_date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`,
      entity_type: 'task',
      entity_id: t.id,
      read: false,
      created_at: now.toISOString(),
    })).filter(n => n.user_id)

    if (notifs.length) {
      await (supabase as any).from('notifications').insert(notifs)
    }
    results.task_notifications_sent = notifs.length
  }

  // ── 3. Lead score decay ───────────────────────────────────────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
  const { data: staleLeads } = await (supabase as any)
    .from('leads')
    .select('id, sentiment_score')
    .lt('last_contacted_at', sevenDaysAgo)
    .gt('sentiment_score', 0)
    .not('status', 'in', '("won","lost","closed_lost")')
    .limit(500)

  if (staleLeads?.length) {
    for (const lead of staleLeads as any[]) {
      const decayed = Math.max(0, (lead.sentiment_score ?? 50) - 5)
      await (supabase as any).from('leads').update({ sentiment_score: decayed }).eq('id', lead.id)
    }
    results.leads_score_decayed = staleLeads.length
  }

  // ── 4. WhatsApp Token Auto-Refresh ─────────────────────────────────────────
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString()
  const { data: expiringWhatsApp } = await (supabase as any)
    .from('company_whatsapp')
    .select('*')
    .eq('is_active', true)
    .not('token_expires_at', 'is', null)
    .lte('token_expires_at', sevenDaysFromNow)

  let waRefreshed = 0
  let waFailed = 0

  if (expiringWhatsApp?.length) {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    for (const wa of expiringWhatsApp as any[]) {
      let success = false
      let newExpiry = null
      let newAccessToken = ''

      if (appId && appSecret) {
        try {
          const exchangeUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${wa.access_token}`
          const refreshRes = await fetch(exchangeUrl)
          
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            if (refreshData.access_token) {
              newAccessToken = refreshData.access_token
              const expiresIn = refreshData.expires_in || (60 * 24 * 3600)
              newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()
              success = true
            }
          } else {
            console.error('[WhatsApp Refresh] Meta API responded with status', refreshRes.status, await refreshRes.text())
          }
        } catch (refreshErr) {
          console.error('[WhatsApp Refresh] Error exchanging token:', refreshErr)
        }
      }

      if (success && newAccessToken && newExpiry) {
        await (supabase as any)
          .from('company_whatsapp')
          .update({
            access_token: newAccessToken,
            token_expires_at: newExpiry,
            updated_at: new Date().toISOString()
          })
          .eq('id', wa.id)
        
        waRefreshed++
      } else {
        waFailed++
        // Auto-refresh failed: Alert company admins
        const { data: admins } = await (supabase as any)
          .from('profiles')
          .select('email, full_name')
          .eq('company_id', wa.company_id)
          .in('role', ['company_admin', 'admin', 'owner'])

        if (admins?.length) {
          for (const admin of admins as any[]) {
            if (admin.email) {
              try {
                await sendEmail({
                  to: admin.email,
                  subject: '⚠️ Action Required: WhatsApp Connection Expiring',
                  html: `
                    <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #333;">
                      <h2 style="color: #e11d48;">WhatsApp Connection Action Required</h2>
                      <p>Hello ${admin.full_name || 'Admin'},</p>
                      <p>The WhatsApp Business API connection for your company (Phone number: <strong>${wa.phone_number || 'N/A'}</strong>) is expiring soon on <strong>${new Date(wa.token_expires_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong>.</p>
                      <p>We attempted to automatically refresh your 60-day token using the Meta API, but the request was unsuccessful (this usually happens if the connection was revoked or the developer credentials changed).</p>
                      <p style="background: #f3f4f6; padding: 12px; border-radius: 8px; font-weight: bold; color: #1f2937;">
                        Please log in to your Klinq CRM dashboard and reconnect your WhatsApp Business account under Settings → Integrations.
                      </p>
                      <p>If you have any questions, please contact support.</p>
                      <p>Best regards,<br/>Klinq CRM Team</p>
                    </div>
                  `
                })
              } catch (emailErr) {
                console.error('[WhatsApp Refresh] Failed to send admin email alert:', emailErr)
              }
            }
          }
        }
      }
    }
  }
  results.whatsapp_tokens_refreshed = waRefreshed
  results.whatsapp_tokens_failed = waFailed

  // Log job
  await (supabase as any).from('audit_logs').insert({
    action: 'cron.daily.run',
    entity_type: 'system',
    entity_id: 'daily-cron',
    new_value: { ...results, run_at: now.toISOString() },
    created_at: now.toISOString(),
  })

  return NextResponse.json({ success: true, results })
}

export async function GET(req: NextRequest) { return POST(req) }
