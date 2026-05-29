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
  } catch (err) {
    console.error('[emitEvents] Unexpected error:', err)
  }
}
