export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { WhatsAppInboxClient, type WALead } from './whatsapp-inbox-client'

export default async function WhatsAppPage() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = createServiceClient()

  // Get company_id
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const companyId: string | null = member?.company_id ?? null

  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-zinc-500 text-sm">Complete onboarding to access WhatsApp.</p>
      </div>
    )
  }

  // Check if WhatsApp is connected for this company
  const { data: waConfig } = await (svc as any)
    .from('company_whatsapp')
    .select('phone_number, display_name')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  const isConnected = !!waConfig

  // Fetch leads that have WhatsApp message history (for conversation list)
  let leads: WALead[] = []
  if (isConnected) {
    const { data: msgs } = await (svc as any)
      .from('whatsapp_messages')
      .select('lead_id, message_text, created_at, direction')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    // Get unique lead IDs with latest message
    const leadMap = new Map<string, { last_message: string; last_message_at: string }>()
    for (const msg of (msgs ?? [])) {
      if (msg.lead_id && !leadMap.has(msg.lead_id)) {
        leadMap.set(msg.lead_id, {
          last_message: msg.message_text ?? '',
          last_message_at: msg.created_at,
        })
      }
    }

    if (leadMap.size > 0) {
      const leadIds = Array.from(leadMap.keys())
      const { data: leadRows } = await (svc as any)
        .from('leads')
        .select('id, full_name, phone')
        .in('id', leadIds)
        .eq('company_id', companyId)

      leads = (leadRows ?? []).map((l: any) => ({
        id: l.id,
        full_name: l.full_name,
        phone: l.phone,
        ...leadMap.get(l.id),
      }))

      // Sort by latest message
      leads.sort((a, b) =>
        new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime()
      )
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950">
      {/* Page header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800/80 shrink-0">
        <div className="size-8 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="size-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.882l6.196-1.624A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.002-1.368l-.36-.214-3.68.965.981-3.594-.235-.37A9.819 9.819 0 012.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">WhatsApp Business</h1>
          <p className="text-xs text-zinc-500">
            {isConnected
              ? `Connected · ${waConfig.phone_number}`
              : 'Not connected'}
          </p>
        </div>
      </div>

      {/* Inbox */}
      <div className="flex-1 overflow-hidden">
        <WhatsAppInboxClient
          companyId={companyId}
          isConnected={isConnected}
          waPhone={waConfig?.phone_number}
          initialLeads={leads}
        />
      </div>
    </div>
  )
}
