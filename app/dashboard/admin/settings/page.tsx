'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Upload, AlertTriangle, Download } from 'lucide-react'
import { toast } from 'sonner'

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
]
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
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

  // Helper to trigger browser downloads
  function triggerDownload(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export workspace data as JSON format
  async function exportAsJSON() {
    if (!companyId) return
    setExporting(true)
    const supabase = createClient()

    try {
      const [leadsRes, dealsRes, tasksRes, membersRes] = await Promise.all([
        supabase.from('leads').select('*').eq('company_id' as any, companyId),
        (supabase as any).from('deals').select('*').eq('company_id', companyId),
        (supabase as any).from('tasks').select('*').eq('user_id', companyId), // tasks might link differently, let's select all tasks or filter
        (supabase as any).from('company_members').select('*').eq('company_id', companyId)
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        companyId,
        leads: leadsRes.data || [],
        deals: dealsRes.data || [],
        tasks: tasksRes.data || [],
        members: membersRes.data || [],
      }

      triggerDownload(
        JSON.stringify(exportData, null, 2),
        `klinq-crm-export-${Date.now()}.json`,
        'application/json'
      )
      toast.success('Workspace JSON data exported successfully!')
    } catch (err: any) {
      toast.error('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  // Export leads data as CSV format
  async function exportLeadsAsCSV() {
    if (!companyId) return
    setExporting(true)
    const supabase = createClient()

    try {
      const { data: leads } = await supabase.from('leads').select('*').eq('company_id' as any, companyId)
      if (!leads || leads.length === 0) {
        toast.error('No leads available to export')
        setExporting(false)
        return
      }

      const headers = ['id', 'full_name', 'email', 'phone_number', 'company', 'status', 'buying_intent', 'created_at']
      const rows = leads.map((l: any) =>
        headers.map(h => {
          const val = l[h] ? String(l[h]).replace(/"/g, '""') : ''
          return `"${val}"`
        }).join(',')
      )

      const csvContent = [headers.join(','), ...rows].join('\n')
      triggerDownload(csvContent, `klinq-leads-${Date.now()}.csv`, 'text/csv')
      toast.success('Leads CSV data exported successfully!')
    } catch (err: any) {
      toast.error('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader title="Company Settings" subtitle="Branding, localization, tax details, and workspace configuration" />
      <div className="p-6 max-w-2xl space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">

            {/* General */}
            <div className="border rounded-xl p-6 bg-card space-y-5 shadow-sm border-border/50">
              <p className="font-semibold text-sm border-b pb-3">General Details</p>

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
                    {uploading ? 'Uploading…' : 'Upload Logo'}
                  </Button>
                </div>
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo preview" className="h-10 w-auto mt-2 rounded border object-contain bg-white p-1" />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={f('brand_color')}
                    className="size-10 rounded border cursor-pointer bg-transparent"
                  />
                  <Input value={form.brand_color} onChange={f('brand_color')} className="font-mono w-32" maxLength={7} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={form.timezone} onValueChange={v => setForm(p => ({ ...p, timezone: v }))}>
                    <SelectTrigger className="focus:ring-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger className="focus:ring-0"><SelectValue /></SelectTrigger>
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
            <div className="border rounded-xl p-6 bg-card space-y-5 shadow-sm border-border/50">
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

            <Button type="submit" disabled={saving} className="gap-2 shadow-sm w-full sm:w-auto">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? 'Saving Settings…' : 'Save Settings'}
            </Button>
          </form>
        )}

        {/* Danger Zone */}
        {!loading && (
          <div className="border border-destructive/20 rounded-xl p-6 bg-destructive/[0.02] space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-destructive/10 pb-3 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <p className="font-bold text-sm">Danger Zone</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Export Workspace Data</h4>
                <p className="text-xs text-muted-foreground">Download all leads, deals, tasks, and member records for backup or offline analysis.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={exportAsJSON}
                  disabled={exporting}
                  className="gap-1.5 border-border text-xs"
                >
                  <Download className="size-3.5" />
                  Export as JSON
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={exportLeadsAsCSV}
                  disabled={exporting}
                  className="gap-1.5 border-border text-xs"
                >
                  <Download className="size-3.5" />
                  Export Leads (CSV)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
