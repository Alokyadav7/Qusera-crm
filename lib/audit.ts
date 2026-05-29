// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface AuditParams {
  req: Request
  supabase: AnySupabase
  companyId: string
  userId: string
  userEmail: string
  action: string
  entityType: string
  entityId: string
  oldValue?: object
  newValue?: object
}

/**
 * logAudit — Write a structured audit log entry to audit_logs table.
 * Call after every successful DB write in API routes.
 * Fire-and-forget: never throws, never blocks the response.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const {
      req, supabase, companyId, userId, userEmail,
      action, entityType, entityId, oldValue, newValue,
    } = params

    // Extract IP from request headers
    const forwarded = (req as any).headers?.get?.('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : null

    await supabase.from('audit_logs').insert({
      company_id: companyId || null,
      user_id: userId,
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      ip_address: ip,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Never let audit logging break the main request
  }
}
