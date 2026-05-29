import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/whatsapp/status
 * Returns the current WhatsApp connection status for the caller's company.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ connected: false })

    const svc = createServiceClient()
    const { data: member } = await (svc as any)
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!member?.company_id) return NextResponse.json({ connected: false })

    const { data: waConfig } = await (svc as any)
      .from('company_whatsapp')
      .select('phone_number, display_name, quality_rating, connected_at, token_expires_at, waba_id')
      .eq('company_id', member.company_id)
      .eq('is_active', true)
      .single()

    if (!waConfig) return NextResponse.json({ connected: false })

    // Check if token is expiring soon (within 7 days)
    const expiresAt = waConfig.token_expires_at ? new Date(waConfig.token_expires_at) : null
    const daysUntilExpiry = expiresAt
      ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      connected: true,
      phone_number: waConfig.phone_number,
      display_name: waConfig.display_name,
      quality_rating: waConfig.quality_rating,
      connected_at: waConfig.connected_at,
      token_expires_at: waConfig.token_expires_at,
      days_until_expiry: daysUntilExpiry,
      expiring_soon: daysUntilExpiry !== null && daysUntilExpiry <= 7,
    })
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message })
  }
}

/**
 * DELETE /api/whatsapp/status
 * Disconnects WhatsApp for the caller's company.
 */
export async function DELETE(req: NextRequest) {
  try {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = createServiceClient()
    const { data: member } = await (svc as any)
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const companyId: string = member.company_id

    // Soft-delete: mark inactive (preserves message history)
    const { error } = await (svc as any)
      .from('company_whatsapp')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)

    if (error) {
      return NextResponse.json({ error: 'Failed to disconnect', code: 'DB_ERROR' }, { status: 500 })
    }

    await (svc as any).from('audit_logs').insert({
      company_id: companyId,
      user_id: user.id,
      action: 'whatsapp.disconnected',
      resource: 'company_whatsapp',
      details: {},
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
