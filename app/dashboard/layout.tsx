'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { CRMSidebar } from '@/components/crm/crm-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, User, Phone, Building2, IndianRupee, Mic, Zap } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { GlobalSearch } from '@/components/global-search'

function QuickAddLeadFAB() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', company: '', source: 'manual', value: '' })
  const router = useRouter()

  async function handleSave() {
    if (!form.name) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await (supabase as any).from('leads').insert({
      user_id: user.id,
      full_name: form.name,
      phone_number: form.phone || null,
      company: form.company || null,
      source: form.source,
      deal_value: form.value ? Number(form.value) : null,
      status: 'new',
      buying_intent: 'medium',
      sentiment_score: 0,
      gst_status: 'pending',
      pan_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    setLoading(false)
    if (error) {
      toast.error('Failed to add lead: ' + error.message)
    } else {
      toast.success(`Lead "${form.name}" added! ✅`)
      setForm({ name: '', phone: '', company: '', source: 'manual', value: '' })
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground pl-4 pr-5 py-3 rounded-full shadow-2xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out font-semibold text-sm quick-add-lead-btn"
        style={{ boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}
      >
        <Plus className="size-5" />
        Quick Add Lead
      </button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="size-4 text-primary" />
              </div>
              Quick Add Lead
            </DialogTitle>
            <DialogDescription>Add a lead in seconds. You can fill in more details later.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ql-name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="ql-name" className="pl-9" placeholder="Rajesh Mehta" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ql-phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="ql-phone" className="pl-9" placeholder="+91 98765 43210" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ql-company">Company</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="ql-company" className="pl-9" placeholder="TechCorp India" value={form.company}
                    onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lead Source</Label>
                <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="voice">Voice Note</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ql-value">Est. Value (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="ql-value" className="pl-9" type="number" placeholder="500000" value={form.value}
                    onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg text-sm text-muted-foreground">
              <Mic className="size-4 text-primary shrink-0" />
              <span>Prefer voice? Go to <strong>Voice to CRM</strong> and just speak the details.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name || loading}
              className="min-w-[120px]"
            >
              {loading ? 'Saving...' : (
                <><Plus className="size-4 mr-1.5" />Add Lead</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Middleware handles redirect, but add client-side fallback
        router.push('/login')
        return
      }

      // Check if platform admin — redirect to super-admin
      const isPlatformAdmin =
        user.user_metadata?.is_platform_admin === true ||
        (user as any).app_metadata?.is_platform_admin === true

      if (isPlatformAdmin) {
        router.push('/super-admin')
        return
      }

      // Check profiles for super admin flag and onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      if ((profile as any)?.is_super_admin) {
        router.push('/super-admin')
        return
      }

      if (!(profile as any)?.onboarding_completed) {
        router.push('/onboarding')
        return
      }

      setUser(user)
      setIsLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else if (session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => { subscription.unsubscribe() }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ImpersonationBanner />
      <GlobalSearch />
      <SidebarProvider>
        <CRMSidebar user={user} />
        <SidebarInset>
          {children}
          <QuickAddLeadFAB />
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
