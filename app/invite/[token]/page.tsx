import { createServiceClient } from '@/lib/supabase/service'
import { InviteAcceptForm } from './invite-accept-form'
import { Shield, XCircle } from 'lucide-react'

async function getInviteByToken(token: string) {
  const svc = createServiceClient()
  const { data } = await svc
    .from('invites')
    .select('*, company:companies(id, name, logo_url, primary_color)')
    .eq('token', token)
    .single()
  return data
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await getInviteByToken(token)

  const isExpired = invite && new Date(invite.expires_at) < new Date()
  const isAccepted = invite && !!invite.accepted_at

  if (!invite || isExpired || isAccepted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-sm">
          <div className="size-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="size-6 text-red-500" />
          </div>
          <h1 className="text-zinc-900 font-semibold text-lg mb-2">
            {isAccepted ? 'Invite Already Used' : 'Invalid Invite Link'}
          </h1>
          <p className="text-zinc-500 text-sm">
            {isAccepted
              ? 'This invite has already been accepted. Try logging in instead.'
              : isExpired
              ? 'This invite has expired. Ask your admin to send a new one.'
              : 'This invite link is invalid or does not exist.'}
          </p>
          <a
            href="/login"
            className="mt-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Go to login
          </a>
        </div>
      </div>
    )
  }

  const company = invite.company as any

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        {/* Company branding */}
        <div className="text-center mb-8">
          <div className="size-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="size-8 object-contain" />
            ) : (
              <img src="/Klinqcrm-logo.png" alt="Klinq CRM" className="size-8 object-contain" />
            )}
          </div>
          <h1 className="text-zinc-900 font-semibold text-xl">{company?.name ?? 'Your Team'}</h1>
          <p className="text-zinc-400 text-sm mt-1">You've been invited to join as <strong className="text-zinc-600">{invite.role}</strong></p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <div className="mb-5 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <p className="text-xs text-zinc-400 mb-0.5">Joining as</p>
            <p className="text-sm text-zinc-800 font-medium">{invite.email}</p>
          </div>

          <InviteAcceptForm token={token} email={invite.email} />
        </div>

        <p className="text-center text-xs text-zinc-400 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-zinc-600 hover:text-zinc-900 transition-colors">Sign in</a>
        </p>
      </div>
    </div>
  )
}
