'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CompanyData {
  id: string
  name: string
  logo_url: string | null
  brand_color: string | null
  plan_id: string | null
  timezone: string
  currency: string
  setup_complete: boolean
}

interface CompanyContextValue {
  company: CompanyData | null
  companyId: string | null
  userId: string | null
  isLoading: boolean
  refresh: () => Promise<void>
  switchCompany: (id: string) => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null, companyId: null, userId: null, isLoading: true,
  refresh: async () => {}, switchCompany: async () => {},
})

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsLoading(false); return }
      setUserId(user.id)

      const { data: uac } = await (supabase as any)
        .from('user_active_company')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      let cid = (uac as any)?.company_id

      if (!cid) {
        const { data: m } = await (supabase as any)
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .single()
        cid = (m as any)?.company_id
      }

      if (!cid) { setIsLoading(false); return }

      const { data: co } = await (supabase as any)
        .from('companies')
        .select('id, name, logo_url, brand_color, plan_id, timezone, currency, setup_complete')
        .eq('id', cid)
        .single()

      if (co) setCompany(co as CompanyData)
    } catch { /* silent */ } finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') return
      load()
    })
    return () => subscription.unsubscribe()
  }, [load])

  const switchCompany = useCallback(async (newId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase as any).from('user_active_company')
      .upsert({ user_id: user.id, company_id: newId }, { onConflict: 'user_id' })
    setCompany(null)
    await load()
  }, [load])

  return (
    <CompanyContext.Provider value={{
      company, companyId: company?.id ?? null,
      userId, isLoading, refresh: load, switchCompany,
    }}>
      {children}
    </CompanyContext.Provider>
  )
}

/** Full company data hook */
export function useCompany() { return useContext(CompanyContext) }
/** Backward-compat alias */
export function useActiveCompany() { return useContext(CompanyContext) }
