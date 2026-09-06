// ─── Klinq CRM — Event Emitter ─────────────────────────────────────────────────
// Central function to emit activity events. Call from every API route
// that mutates state (lead updates, task completions, member joins, etc.)

import { createServiceClient } from '@/lib/supabase/service'
import type { Json } from '@/lib/supabase/database.types'
import type { EmitEventInput } from './types'

/**
 * Emit an activity event to the central activity_events table.
 * Non-blocking — errors are logged but never throw to caller.
 *
 * @example
 * await emitEvent({
 *   companyId: ctx.companyId,
 *   actorId: ctx.userId,
 *   eventType: 'lead.created',
 *   resourceType: 'lead',
 *   resourceId: lead.id,
 *   resourceLabel: lead.full_name,
 * })
 */
export async function emitEvent(input: EmitEventInput): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('activity_events').insert({
      company_id: input.companyId ?? null,
      workspace_id: input.workspaceId ?? null,
      actor_id: input.actorId ?? null,
      actor_type: input.actorType ?? 'user',
      event_type: input.eventType,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      resource_label: input.resourceLabel ?? null,
      metadata: (input.metadata ?? {}) as Json,
      ip_address: input.ipAddress ?? null,
    })
    if (error) {
      console.error('[emitEvent] Failed to write event:', error.message)
    }

    if (input.companyId) {
      executeAutomations(
        input.companyId,
        input.eventType,
        input.resourceId ?? null,
        input.resourceLabel ?? null,
        input.metadata
      ).catch(err => {
        console.error('[emitEvent] Automation trigger failed:', err)
      })
    }
  } catch (err) {
    // Never crash the caller — events are best-effort
    console.error('[emitEvent] Unexpected error:', err)
  }
}

/**
 * Emit multiple events in a single insert (batch).
 */
export async function emitEvents(inputs: EmitEventInput[]): Promise<void> {
  if (inputs.length === 0) return
  try {
    const supabase = createServiceClient()
    const rows = inputs.map(input => ({
      company_id: input.companyId ?? null,
      workspace_id: input.workspaceId ?? null,
      actor_id: input.actorId ?? null,
      actor_type: input.actorType ?? 'user',
      event_type: input.eventType,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      resource_label: input.resourceLabel ?? null,
      metadata: (input.metadata ?? {}) as Json,
      ip_address: input.ipAddress ?? null,
    }))
    const { error } = await supabase.from('activity_events').insert(rows)
    if (error) {
      console.error('[emitEvents] Failed to write events:', error.message)
    }

    for (const input of inputs) {
      if (input.companyId) {
        executeAutomations(
          input.companyId,
          input.eventType,
          input.resourceId ?? null,
          input.resourceLabel ?? null,
          input.metadata
        ).catch(err => {
          console.error('[emitEvents] Automation trigger failed:', err)
        })
      }
    }
  } catch (err) {
    console.error('[emitEvents] Unexpected error:', err)
  }
}

/**
 * Workflow Automation Execution Engine
 */
async function executeAutomations(
  companyId: string,
  eventType: string,
  resourceId: string | null,
  resourceLabel: string | null,
  metadata: any
): Promise<void> {
  const supabase = createServiceClient() as any

  try {
    // Support matching both standard 'lead.created' and UI/DB 'lead_created' trigger event formats
    const matchEventTypes = [eventType]
    if (eventType === 'lead.created') {
      matchEventTypes.push('lead_created')
    } else if (eventType === 'lead_created') {
      matchEventTypes.push('lead.created')
    }

    // 1. Fetch active automations for the company and trigger event
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('company_id', companyId)
      .in('trigger_event', matchEventTypes)
      .eq('is_active', true)

    if (error || !automations || automations.length === 0) {
      return
    }

    for (const automation of automations) {
      try {
        // Increment run count and update last run timestamp
        await supabase
          .from('automations')
          .update({
            run_count: (automation.run_count || 0) + 1,
            last_run_at: new Date().toISOString(),
          })
          .eq('id', automation.id)

        const actions = automation.actions || []
        const logDetails: any = { actionsRun: [] }

        for (const action of actions) {
          const actionType = action.type
          const config = action.config || {}
          const detail = config.detail || ''
          const actionResult = { type: actionType, success: true, message: '' }

          try {
            if (actionType === 'send_notification') {
              let targetUserId = metadata?.assigned_to || metadata?.user_id
              if (!targetUserId) {
                const { data: member } = await supabase
                  .from('company_members')
                  .select('user_id')
                  .eq('company_id', companyId)
                  .eq('is_active', true)
                  .limit(1)
                  .maybeSingle()
                targetUserId = member?.user_id || null
              }

              if (targetUserId) {
                const { error: notifError } = await supabase.from('notifications').insert({
                  company_id: companyId,
                  user_id: targetUserId,
                  title: `Automation: ${automation.name}`,
                  body: detail || `Triggered by ${eventType} on ${resourceLabel || 'resource'}.`,
                  entity_type: 'lead',
                  entity_id: resourceId || null,
                  read: false,
                  created_at: new Date().toISOString(),
                })
                if (notifError) throw notifError
                actionResult.message = `Notification created for user ${targetUserId}`
              } else {
                actionResult.success = false
                actionResult.message = 'No active member to notify'
              }
            } else if (actionType === 'send_email') {
              let toEmail = metadata?.email
              if (!toEmail) {
                const { data: members } = await supabase
                  .from('company_members')
                  .select('user_id')
                  .eq('company_id', companyId)
                  .eq('role', 'company_admin')
                  .limit(1)
                if (members && members.length > 0) {
                  const { data: { user: adminAuth } } = await supabase.auth.admin.getUserById(members[0].user_id)
                  toEmail = adminAuth?.email
                }
              }

              if (toEmail) {
                const { sendEmail } = await import('@/lib/email')
                await sendEmail({
                  to: toEmail,
                  subject: `Automation Alert: ${automation.name}`,
                  html: `<p>Detail: ${detail}</p><p>Triggered on ${eventType}</p>`,
                })
                actionResult.message = `Email sent to ${toEmail}`
              } else {
                actionResult.success = false
                actionResult.message = 'No target email found'
              }
            } else if (actionType === 'assign_to_user') {
              const targetUserId = detail.trim()
              if (targetUserId && resourceId) {
                const { error: assignError } = await supabase
                  .from('leads')
                  .update({ assigned_to: targetUserId })
                  .eq('id', resourceId)
                if (assignError) throw assignError
                actionResult.message = `Assigned lead to user ${targetUserId}`
              } else {
                actionResult.success = false
                actionResult.message = 'Missing target user or resource ID'
              }
            } else if (actionType === 'create_task') {
              let targetUserId = metadata?.assigned_to || metadata?.user_id
              if (!targetUserId) {
                const { data: member } = await supabase
                  .from('company_members')
                  .select('user_id')
                  .eq('company_id', companyId)
                  .eq('is_active', true)
                  .limit(1)
                  .maybeSingle()
                targetUserId = member?.user_id || null
              }

              if (targetUserId) {
                const { error: taskError } = await supabase.from('tasks').insert({
                  company_id: companyId,
                  user_id: targetUserId,
                  title: detail || `Task from automation: ${automation.name}`,
                  due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  priority: 'medium',
                  task_type: 'other',
                  is_completed: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                if (taskError) throw taskError
                actionResult.message = `Task created for user ${targetUserId}`
              } else {
                actionResult.success = false
                actionResult.message = 'No target user to assign task'
              }
            } else if (actionType === 'send_whatsapp') {
              const targetPhone = metadata?.phone || metadata?.phone_number
              if (targetPhone) {
                actionResult.message = `WhatsApp message simulated for ${targetPhone}: ${detail}`
              } else {
                actionResult.success = false
                actionResult.message = 'No phone number found'
              }
            } else {
              actionResult.message = `Action ${actionType} executed (no-op)`
            }
          } catch (actionErr: any) {
            actionResult.success = false
            actionResult.message = actionErr?.message || 'Unknown action error'
          }

          logDetails.actionsRun.push(actionResult)
        }

        const allSuccess = logDetails.actionsRun.every((r: any) => r.success)

        await supabase.from('automation_logs').insert({
          automation_id: automation.id,
          company_id: companyId,
          status: allSuccess ? 'success' : 'failed',
          details: logDetails,
        })
      } catch (automationErr: any) {
        console.error('[executeAutomations] Failed automation rule execution:', automationErr)
        await supabase.from('automation_logs').insert({
          automation_id: automation.id,
          company_id: companyId,
          status: 'failed',
          details: { error: automationErr?.message || 'Internal rule execution crash' },
        })
      }
    }
  } catch (err: any) {
    console.error('[executeAutomations] Fatal error:', err)
  }
}
