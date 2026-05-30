'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useRef } from 'react'

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
]
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    brand_color: '#818cf8',
    custom_domain: '',
    gstin: '',
    address: '',
    logo_url: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const res = await (supabase as any).from('company_members').select('company_id').eq('user_id', user.id).eq('is_active', true).single()
      const cid = res.data?.company_id
      if (!cid) { setLoading(false); return }
      setCompanyId(cid)
      const { data: co } = await (supabase as any)
        .from('companies')
        .select('name, timezone, currency, brand_color, custom_domain, gstin, address, logo_url')
        .eq('id', cid)
        .single()
      if (co) setForm({
        name: co.name ?? '',
        timezone: co.timezone ?? 'Asia/Kolkata',
        currency: co.currency ?? 'INR',
        brand_color: co.brand_color ?? '#818cf8',
        custom_domain: co.custom_domain ?? '',
        gstin: co.gstin ?? '',
        address: co.address ?? '',
        logo_url: co.logo_url ?? '',
      })
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('companies')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', companyId)
    if (error) toast.error(error.message)
    else toast.success('Company settings saved!')
    setSaving(false)
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !companyId) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `${companyId}/logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('company-logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast.error('Upload failed: ' + upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(path)
      setForm(p => ({ ...p, logo_url: publicUrl }))
      toast.success('Logo uploaded! Click Save Settings to apply.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Company Settings" subtitle="Branding, localization, tax details, and workspace configuration" />
      <div className="p-6 max-w-2xl">
        {loading ? <Loader2 className="size-6 animate-spin text-muted-foreground" /> : (
          <form onSubmit={handleSave} className="space-y-6">

            {/* General */}
            <div className="border rounded-xl p-6 bg-card space-y-5">
              <p className="font-semibold text-sm border-b pb-3">General</p>

              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input value={form.name} onChange={f('name')} placeholder="Acme Corp" />
              </div>

              <div className="space-y-1.5">
                <Label>Company Logo</Label>
                <div className="flex gap-2">
                  <Input value={form.logo_url} onChange={f('logo_url')} placeholder="https://... (paste URL or upload below)" className="flex-1" />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 gap-1.5"
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo preview" className="h-10 w-auto mt-2 rounded border object-contain" />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={f('brand_color')}
                    className="size-10 rounded border cursor-pointer"
                  />
                  <Input value={form.brand_color} onChange={f('brand_color')} className="font-mono w-32" maxLength={7} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={form.timezone} onValueChange={v => setForm(p => ({ ...p, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Custom Domain <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={form.custom_domain} onChange={f('custom_domain')} placeholder="crm.yourcompany.com" />
              </div>
            </div>

            {/* Tax & Billing Details */}
            <div className="border rounded-xl p-6 bg-card space-y-5">
              <p className="font-semibold text-sm border-b pb-3">Tax & Billing Details</p>

              <div className="space-y-1.5">
                <Label>GSTIN <span className="text-muted-foreground text-xs">(used on invoices)</span></Label>
                <Input
                  value={form.gstin}
                  onChange={f('gstin')}
                  placeholder="22AAAAA0000A1Z5"
                  className="font-mono uppercase"
                  maxLength={15}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Company Address</Label>
                <textarea
                  value={form.address}
                  onChange={f('address')}
                  placeholder="123, Business Park, Mumbai 400001, Maharashtra, India"
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
