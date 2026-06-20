'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, ChevronDown, Check, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

interface UserCompany {
  company_id: string
  company: { id: string; name: string; slug: string; logo_url?: string | null; status: string }
}

interface Props {
  user?: User | null
}

export function OrgSwitcher({ user }: Props) {
  const [companies, setCompanies] = useState<UserCompany[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all companies user belongs to
      const { data: memberships } = await supabase
        .from('company_members')
        .select('company_id, company:companies(id, name, slug, logo_url, status)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('deleted_at', null)

      setCompanies((memberships ?? []) as unknown as UserCompany[])

      // Get active company
      const { data: active } = await supabase
        .from('user_active_company')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      setActiveCompanyId(active?.company_id ?? null)
    }

    load()
  }, [user])

  const activeCompany = companies.find(c => c.company_id === activeCompanyId)?.company

  async function switchCompany(companyId: string) {
    if (companyId === activeCompanyId) { setOpen(false); return }
    try {
      const res = await fetch('/api/auth/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      if (!res.ok) { toast.error((await res.json()).error ?? 'Failed'); return }
      setActiveCompanyId(companyId)
      setOpen(false)
      toast.success('Switched workspace')
      router.refresh()
    } catch {
      toast.error('Failed to switch company')
    }
  }

  // Don't show switcher if user only has one company (no choice to make)
  if (companies.length <= 1 && activeCompanyId) {
    const co = companies[0]?.company
    if (!co) return null
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
        <div className="size-5 rounded bg-muted flex items-center justify-center border border-border/50 shrink-0">
          <Building2 className="size-3 text-muted-foreground" />
        </div>
        <p className="text-xs font-medium text-foreground truncate flex-1">{co.name}</p>
      </div>
    )
  }

  if (companies.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left"
      >
        <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0 border border-border/50">
          {activeCompany?.logo_url ? (
            <img src={activeCompany.logo_url} alt="" className="size-4 object-contain" />
          ) : (
            <Building2 className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {activeCompany?.name ?? 'Select workspace'}
          </p>
        </div>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px]">
            <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Your Workspaces
            </p>
            {companies.map(({ company_id, company }) => (
              <button
                key={company_id}
                onClick={() => switchCompany(company_id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors text-left"
              >
                <div className="size-5 rounded bg-muted flex items-center justify-center border border-border/50 shrink-0">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="" className="size-3.5 object-contain" />
                  ) : (
                    <Building2 className="size-3 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm text-foreground flex-1 truncate">{company.name}</span>
                {company_id === activeCompanyId && (
                  <Check className="size-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <Link
                href="/onboarding"
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground text-sm"
              >
                <Plus className="size-3.5" />
                Add another company
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
