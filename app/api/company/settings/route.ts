import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { withTenantAuth } from '@/lib/middleware/withTenantAuth'
import { emitEvent } from '@/lib/events/emit'

// PATCH /api/company/settings
export const PATCH = withTenantAuth(async (req: NextRequest, ctx) => {
  const body = await req.json()
  const svc = createServiceClient()

  const allowed = ['name', 'timezone', 'currency', 'custom_domain', 'primary_color', 'logo_url']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await (svc as any)
    .from('companies')
    .update(updates)
    .eq('id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void emitEvent({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    actorType: 'user',
    eventType: 'company.updated',
    resourceType: 'company',
    resourceId: ctx.companyId,
    metadata: { fields: Object.keys(updates) },
  })

  return NextResponse.json({ success: true })
}, { requiredRoles: ['owner', 'admin'] })
