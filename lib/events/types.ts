// ─── Klinq CRM — Activity Event Types ─────────────────────────────────────────

export type ActivityEventType =
  // Lead events
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'lead.status_changed'
  | 'lead.assigned'
  | 'lead.scored'
  // Task events
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.deleted'
  // Pipeline events
  | 'pipeline.created'
  | 'pipeline.stage_changed'
  | 'pipeline.deleted'
  // Communication
  | 'whatsapp.message_sent'
  | 'whatsapp.reply_received'
  | 'sms.sent'
  | 'email.sent'
  // Notes & comments
  | 'note.added'
  | 'comment.added'
  // Team management
  | 'member.invited'
  | 'member.joined'
  | 'member.removed'
  | 'member.role_changed'
  | 'member.suspended'
  | 'invite.sent'
  | 'invite.accepted'
  | 'invite.expired'
  // Company
  | 'company.created'
  | 'company.updated'
  | 'company.suspended'
  | 'company.activated'
  | 'company.plan_changed'
  | 'company.deleted'
  // Feature flags
  | 'feature.toggled'
  // Impersonation
  | 'impersonation.started'
  | 'impersonation.ended'
  // Automation & AI
  | 'automation.triggered'
  | 'automation.completed'
  | 'automation.failed'
  | 'ai.scored_lead'
  | 'ai.generated_summary'
  // Jobs
  | 'job.enqueued'
  | 'job.completed'
  | 'job.failed'

export interface EmitEventInput {
  companyId?: string | null
  workspaceId?: string | null
  actorId?: string | null
  actorType?: 'user' | 'system' | 'automation' | 'super_admin'
  eventType: ActivityEventType
  resourceType?: string
  resourceId?: string
  resourceLabel?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}
