export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { AlertOctagon, Mail, ArrowLeft } from 'lucide-react'

interface CompanyData {
  name: string
  logo_url: string | null
  suspension_reason: string | null
}

interface PlatformSettings {
  support_email: string
  platform_name: string
}

async function getSuspensionData(): Promise<CompanyData | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const svc = createServiceClient()
    const { data: member } = await (svc as any)
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single()
    if (!member) return null

    const { data: company } = await (svc as any)
      .from('companies')
      .select('name, logo_url, suspension_reason')
      .eq('id', member.company_id)
      .single()

    return (company as CompanyData) ?? null
  } catch { return null }
}

async function getPlatformSettings(): Promise<PlatformSettings | null> {
  try {
    const svc = createServiceClient()
    const { data } = await (svc as any)
      .from('platform_settings')
      .select('support_email, platform_name')
      .eq('id', 1)
      .single()
    return (data as PlatformSettings) ?? null
  } catch { return null }
}

export default async function SuspendedPage() {
  const [company, settings] = await Promise.all([getSuspensionData(), getPlatformSettings()])
  const supportEmail = settings?.support_email ?? 'support@Klinq.app'
  const platformName = settings?.platform_name ?? 'Klinq'

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-6 text-center">
        {/* Icon */}
        <div className="size-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
          <AlertOctagon className="size-8 text-red-500" />
        </div>

        {/* Message */}
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Account Suspended</h1>
          {company?.name && (
            <p className="text-zinc-500 text-sm mt-1">
              <strong className="text-zinc-700">{company.name}</strong>&apos;s account has been suspended.
            </p>
          )}
        </div>

        {/* Reason */}
        {company?.suspension_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Reason</p>
            <p className="text-sm text-red-800">{company.suspension_reason}</p>
          </div>
        )}

        {/* Support */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <p className="text-sm text-zinc-600">
            If you believe this is a mistake, please contact{' '}
            <strong className="text-zinc-800">{platformName} support</strong>:
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-zinc-900 hover:underline"
          >
            <Mail className="size-4" />
            {supportEmail}
          </a>
        </div>

        {/* Back to login */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
