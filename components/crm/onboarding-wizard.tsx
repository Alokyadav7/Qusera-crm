'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Building2, Users, Plug, Upload, CheckCircle, ChevronRight, ChevronLeft, Loader2, X, KeyRound, Eye, EyeOff } from 'lucide-react'

interface OnboardingWizardProps {
  companyId: string
  initialStep?: number
}

const STEPS = [
  { id: 0, label: 'Set Password', icon: KeyRound },
  { id: 1, label: 'Company Profile', icon: Building2 },
  { id: 2, label: 'Invite Team', icon: Users },
  { id: 3, label: 'Integrations', icon: Plug },
  { id: 4, label: 'Done!', icon: CheckCircle },
]

function checkPasswordStrength(pw: string) {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  return { checks, score, valid: score === 4 }
}


const INDUSTRIES = ['SaaS', 'Real Estate', 'Finance', 'Healthcare', 'EdTech', 'Retail', 'Manufacturing', 'Consulting', 'Other']
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin']
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']

// ── Step 0 — Force Password Change ────────────────────────────────────────────
function Step0({ onNext }: { onNext: () => void }) {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const strength = checkPasswordStrength(form.password)

  const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500']

  const handleSubmit = async () => {
    setError(null)

    if (!form.password) { setError('Please enter a password'); return }
    if (!strength.valid) {
      setError('Password must have 8+ chars, 1 uppercase, 1 number, 1 special character.')
      return
    }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }

    setSaving(true)
    try {
      const supabase = createClient()

      // 1. Update password (15s timeout guard)
      const { error } = await Promise.race([
        supabase.auth.updateUser({ password: form.password }),
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Connection timed out. Check your internet and try again.') }), 15000)
        ),
      ])

      if (error) {
        setError(error.message)
        toast.error(error.message)
        setSaving(false)
        return
      }

      // 2. Fire-and-forget: mark temp_password_used=true in DB so page reloads
      //    correctly skip Step 0 and start from Step 1.
      fetch('/api/onboarding/complete-step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 0 }),
      }).catch(() => {})

      // 3. Just advance to next step — onNext() = setStep(1), pure local React state.
      //    No page reload, no middleware, no JWT issues.
      toast.success('Password set! Continuing...')
      onNext()

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      toast.error('Something went wrong. Please try again.')
      setSaving(false)
    }
  }


  return (
    <div className="space-y-5">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        🔐 Your account was created with a temporary password. Please set a new password to continue.
      </div>

      {/* Inline error display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>New Password <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Input
            type={showPw ? 'text' : 'password'}
            placeholder="Min. 8 chars, uppercase, number, special char"
            value={form.password}
            onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError(null) }}
            autoFocus
          />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {/* Strength bar — always shown when user starts typing */}
        {form.password && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`h - 1 flex - 1 rounded - full transition - all ${i < strength.score ? STRENGTH_COLORS[strength.score] : 'bg-muted'} `} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{STRENGTH_LABELS[strength.score]}</p>
            <ul className="grid grid-cols-2 gap-1">
              {([['length', '8+ characters'], ['upper', '1 uppercase'], ['number', '1 number'], ['special', '1 special char']] as const).map(([k, label]) => (
                <li key={k} className={`text - xs flex items - center gap - 1 ${strength.checks[k] ? 'text-emerald-600' : 'text-muted-foreground'} `}>
                  <span>{strength.checks[k] ? '✓' : '○'}</span> {label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Confirm Password <span className="text-destructive">*</span></Label>
        <Input
          type={showPw ? 'text' : 'password'}
          placeholder="Repeat password"
          value={form.confirm}
          onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); setError(null) }}
        />
        {form.confirm && form.password !== form.confirm && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}
      </div>

      {/* Button is only disabled while saving — NOT blocked by strength.valid.
          Validation happens inside handleSubmit with clear error messages. */}
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={saving}
        id="step0-submit-btn"
      >
        {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        {saving ? 'Setting password...' : 'Set Password & Continue'}
        {!saving && <ChevronRight className="size-4 ml-1" />}
      </Button>
    </div>
  )
}

// ── Step 1 — Company Profile ──────────────────────────────────────────────────
function Step1({ companyId, onNext }: { companyId: string; onNext: () => void }) {
  const [form, setForm] = useState({ name: '', industry: '', website: '', timezone: 'Asia/Kolkata', currency: 'INR' })
  const [saving, setSaving] = useState(false)
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    async function loadCompany() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('companies')
          .select('name, industry, website, timezone, currency')
          .eq('id', companyId)
          .maybeSingle()
        if (data) {
          setForm({
            name: data.name || '',
            industry: data.industry || '',
            website: data.website || '',
            timezone: data.timezone || 'Asia/Kolkata',
            currency: data.currency || 'INR',
          })
        }
      } catch (err) {
        console.error('Failed to prefill company profile:', err)
      }
    }
    loadCompany()
  }, [companyId])

  const save = async () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return }
    setSaving(true)
    // Use the API route so it runs with service-role and bypasses RLS
    const res = await fetch('/api/onboarding/complete-step', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 1,
        data: {
          name: form.name.trim(),
          timezone: form.timezone,
          currency: form.currency,
          ...(form.industry ? { industry: form.industry } : {}),
          ...(form.website ? { website: form.website } : {}),
        },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save' }))
      toast.error(err.error || 'Failed to save company profile')
      setSaving(false)
      return
    }
    onNext()
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Company Name *</Label>
        <Input placeholder="Acme Corp" value={form.name} onChange={e => f('name')(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <Select value={form.industry} onValueChange={f('industry')}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input placeholder="https://acme.com" value={form.website} onChange={e => f('website')(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select value={form.timezone} onValueChange={f('timezone')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={f('currency')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Save & Continue <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  )
}

// ── Step 2 — Invite Team ──────────────────────────────────────────────────────
function Step2({ companyId, onNext, onSkip }: { companyId: string; onNext: () => void; onSkip: () => void }) {
  const [rows, setRows] = useState([{ email: '', role: 'sales_rep' }])
  const [sending, setSending] = useState(false)

  const send = async () => {
    const valid = rows.filter(r => r.email.trim())
    if (!valid.length) { onSkip(); return }
    setSending(true)
    
    let sentCount = 0
    let failedCount = 0
    let lastError = ''

    for (const r of valid) {
      try {
        const res = await fetch('/api/invites/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: r.email.trim(), role: r.role }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && !data.emailError) {
          sentCount++
        } else {
          failedCount++
          lastError = data.emailError || data.error || 'Failed to send invite'
        }
      } catch (err: any) {
        failedCount++
        lastError = err.message || 'Network error'
      }
    }

    if (sentCount > 0) {
      toast.success(`${sentCount} invitation(s) sent successfully!`)
    }
    if (failedCount > 0) {
      toast.error(`Failed to send ${failedCount} invitation(s). Error: ${lastError}`)
    }

    if (sentCount > 0) {
      await fetch('/api/onboarding/complete-step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2 }),
      }).catch(() => {})
      onNext()
    }
    setSending(false)
  }


  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add team members — they'll receive an email invite.</p>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input className="flex-1" type="email" placeholder="teammate@company.com"
            value={row.email} onChange={e => setRows(p => p.map((r, j) => j === i ? { ...r, email: e.target.value } : r))} />
          <Select value={row.role} onValueChange={v => setRows(p => p.map((r, j) => j === i ? { ...r, role: v } : r))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['company_admin', 'sales_manager', 'sales_rep', 'viewer'].map(r => (
                <SelectItem key={r} value={r} className="text-xs capitalize">{r.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rows.length > 1 && (
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setRows(p => p.filter((_, j) => j !== i))}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setRows(p => [...p, { email: '', role: 'sales_rep' }])}>
        + Add Another
      </Button>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onSkip}>Skip for now</Button>
        <Button className="flex-1" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
          Send Invites <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ── Step 3 — Connect Integrations ─────────────────────────────────────────────
function Step3({ onNext }: { onNext: () => void }) {
  const integrations = [
    { id: 'email', name: 'Resend Email', desc: 'Send transactional & marketing emails', envKey: 'RESEND_API_KEY', icon: '📧' },
    { id: 'whatsapp', name: 'WhatsApp Business', desc: 'Two-way WhatsApp messaging', envKey: 'META_WHATSAPP_TOKEN', icon: '💬' },
    { id: 'sms', name: 'Fast2SMS', desc: 'Bulk & transactional SMS in India', envKey: 'FAST2SMS_API_KEY', icon: '📱' },
  ]

  const handleNext = async () => {
    // Mark step 3 complete server-side
    await fetch('/api/onboarding/complete-step', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 3 }),
    }).catch(() => { }) // non-fatal
    onNext()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Connect your communication channels. You can configure these later in Settings → Integrations.</p>
      {integrations.map(intg => (
        <div key={intg.id} className="flex items-center gap-3 p-4 border rounded-xl hover:bg-muted/20 transition-colors">
          <span className="text-2xl">{intg.icon}</span>
          <div className="flex-1">
            <p className="font-medium text-sm">{intg.name}</p>
            <p className="text-xs text-muted-foreground">{intg.desc}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.open('/dashboard/integrations', '_blank')}>
            Configure
          </Button>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={handleNext}>Skip for now</Button>
        <Button className="flex-1" onClick={handleNext}>Continue <ChevronRight className="size-4 ml-1" /></Button>
      </div>
    </div>
  )
}

// ── Step 4 — Import Leads ─────────────────────────────────────────────────────
function Step4({ companyId, onNext }: { companyId: string; onNext: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imported, setImported] = useState<number | null>(null)

  const CRM_FIELDS = ['full_name', 'email', 'phone_number', 'company', 'city', 'state', 'source', 'status', 'estimated_budget']

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    const text = await f.text()
    const rows = text.split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
    if (!rows.length) return
    const hdrs = rows[0]
    setHeaders(hdrs)
    setPreview(rows.slice(1, 6))
    // Auto-map common column names
    const auto: Record<string, string> = {}
    hdrs.forEach(h => {
      const lower = h.toLowerCase()
      if (lower.includes('name')) auto[h] = 'full_name'
      else if (lower.includes('email')) auto[h] = 'email'
      else if (lower.includes('phone') || lower.includes('mobile')) auto[h] = 'phone_number'
      else if (lower.includes('company') || lower.includes('org')) auto[h] = 'company'
      else if (lower.includes('city')) auto[h] = 'city'
      else if (lower.includes('state')) auto[h] = 'state'
      else if (lower.includes('source')) auto[h] = 'source'
    })
    setMapping(auto)
  }, [])

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    const text = await file.text()
    const rows = text.split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
    const hdrs = rows[0]
    const dataRows = rows.slice(1).filter(r => r.some(c => c.trim()))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const leads = dataRows.map(row => {
      const lead: Record<string, unknown> = {
        user_id: user?.id,
        company_id: companyId,
        status: 'new',
        buying_intent: 'medium',
        sentiment_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      hdrs.forEach((h, i) => {
        const field = mapping[h]
        if (field && row[i]) lead[field] = row[i]
      })
      return lead
    }).filter(l => l.full_name || l.email || l.phone_number)

    // Batch insert in chunks of 100
    let done = 0
    const BATCH = 100
    for (let i = 0; i < leads.length; i += BATCH) {
      const batch = leads.slice(i, i + BATCH)
      await (supabase as any).from('leads').insert(batch)
      done += batch.length
      setProgress(Math.round((done / leads.length) * 100))
    }

    // Mark step complete via API (uses service client — bypasses RLS)
    await fetch('/api/onboarding/complete-step', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 3 }), // step 3 = integrations/import step
    }).catch(() => { })

    setImported(done)
    setImporting(false)
  }

  if (imported !== null) return (
    <div className="text-center py-8 space-y-3">
      <CheckCircle className="size-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-bold">{imported} leads imported!</h3>
      <p className="text-muted-foreground text-sm">Your leads are ready in the CRM.</p>
      <Button className="w-full" onClick={onNext}>Continue to Dashboard <ChevronRight className="size-4 ml-1" /></Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Upload a CSV file to bulk-import your leads. You can skip and add leads manually.</p>

      <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/20 transition-colors">
        <Upload className="size-8 text-muted-foreground mb-2" />
        <span className="text-sm font-medium">{file ? file.name : 'Click to upload CSV'}</span>
        <span className="text-xs text-muted-foreground mt-1">Comma-separated values, max 10MB</span>
        <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </label>

      {headers.length > 0 && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Map Columns</p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground truncate flex-1">{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select value={mapping[h] || '_skip'} onValueChange={v => setMapping(p => ({ ...p, [h]: v === '_skip' ? '' : v }))}>
                    <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip" className="text-xs text-muted-foreground">Skip</SelectItem>
                      {CRM_FIELDS.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Preview (first 5 rows)</p>
            <table className="w-full text-xs border rounded-lg overflow-hidden">
              <thead><tr>{headers.map(h => <th key={h} className="px-2 py-1.5 bg-muted text-left font-medium truncate max-w-[100px]">{h}</th>)}</tr></thead>
              <tbody className="divide-y">{preview.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className="px-2 py-1.5 truncate max-w-[100px] text-muted-foreground">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>

          {importing && (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-center text-muted-foreground">{progress}% imported...</p>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onNext}>Skip for now</Button>
        <Button className="flex-1" onClick={handleImport} disabled={!file || importing}>
          {importing ? <Loader2 className="size-4 animate-spin mr-1" /> : <Upload className="size-4 mr-1" />}
          Import Leads
        </Button>
      </div>
    </div>
  )
}

// ── Step 5 — Done ─────────────────────────────────────────────────────────────
function Step5({ companyId, onClear }: { companyId: string; onClear?: () => void }) {
  const router = useRouter()
  const [done, setDone] = useState<Set<string>>(new Set())

  const checklist = [
    { id: 'lead', label: 'Add your first lead manually', href: '/dashboard/leads' },
    { id: 'deal', label: 'Create your first deal', href: '/dashboard/deals' },
    { id: 'automation', label: 'Set up an automation', href: '/dashboard/automations' },
    { id: 'email', label: 'Send your first email', href: '/dashboard/email' },
  ]

  const finish = async () => {
    // Use the API to mark onboarding complete — runs with service role,
    // bypasses RLS, and sets both profiles.onboarding_completed + companies.setup_complete
    try {
      const res = await fetch('/api/onboarding/complete-step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 4 }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('[Step5] Final complete failed:', errData)
        toast.error('Failed to complete setup. Please try again.')
        return
      }
      console.log('[Step5] Onboarding marked complete ✅')
    } catch (err) {
      console.error('[Step5] Unexpected error:', err)
      toast.error('Something went wrong. Please try again.')
      return
    }
    // Clear sessionStorage so step doesn't persist after completion
    onClear?.()
    // Hard navigation: clears all Next.js router state and re-runs middleware
    // with the updated onboarding_completed=true from DB — prevents looping back
    window.location.href = '/dashboard'
  }


  return (
    <div className="space-y-6 text-center">
      <div className="text-6xl animate-bounce">🎉</div>
      <div>
        <h3 className="text-2xl font-bold">You're all set!</h3>
        <p className="text-muted-foreground mt-1">Your Klinq CRM workspace is ready. Here's a quick-start checklist:</p>
      </div>
      <div className="text-left space-y-2">
        {checklist.map(item => (
          <button
            key={item.id}
            onClick={() => { setDone(prev => new Set([...prev, item.id])); router.push(item.href) }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-primary/30 hover:bg-muted/20 ${done.has(item.id) ? 'opacity-50' : ''}`}
          >
            <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done.has(item.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
              {done.has(item.id) && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={`text-sm ${done.has(item.id) ? 'line-through text-muted-foreground' : 'font-medium'}`}>{item.label}</span>
            <ChevronRight className="size-4 ml-auto text-muted-foreground" />
          </button>
        ))}
      </div>
      <Button className="w-full" size="lg" onClick={finish}>
        Go to Dashboard →
      </Button>
    </div>
  )
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'klinq_onboarding_step'

export function OnboardingWizard({ companyId, initialStep = 0 }: OnboardingWizardProps) {
  // ✅ FIX B: ALWAYS check sessionStorage first, regardless of initialStep.
  // supabase.auth.updateUser() fires USER_UPDATED which can cause the server
  // to re-render /onboarding with initialStep=0 (before temp_password_used
  // DB write completes). Old code ignored sessionStorage when initialStep=0,
  // causing the wizard to reset. Now sessionStorage always wins if present.
  const [step, setStepRaw] = useState(() => {
    if (typeof window === 'undefined') return initialStep
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
        console.log('[Wizard] Restored step from sessionStorage:', parsed, '(server initialStep:', initialStep, ')')
        return parsed
      }
    }
    return initialStep
  })

  // Wrap setStep to also persist to sessionStorage
  const setStep = (updater: number | ((prev: number) => number)) => {
    setStepRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { sessionStorage.setItem(STORAGE_KEY, String(next)) } catch { }
      return next
    })
  }

  // Session guard — if no active session redirect to login
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('[OnboardingWizard] No active session — redirecting to login')
        window.location.href = '/login'
        return
      }
      console.log('[OnboardingWizard] Session valid:', session.user.email, '| initialStep:', initialStep)
    }
    checkSession()
  }, [])

  // ✅ FIX C: Intercept USER_UPDATED so it never resets the wizard.
  // updateUser() fires this event client-side after password change.
  // Without this, React might re-read initialStep prop from a stale server render.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[Wizard] Auth event:', event)
      if (event === 'USER_UPDATED') {
        console.log('[Wizard] USER_UPDATED — keeping current step (sessionStorage holds position)')
        // Do nothing — sessionStorage already has step=1
      }
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Cannot go back to step 0 (password change) once completed
  const next = () => setStep(s => Math.min(s + 1, 4))
  const back = () => setStep(s => Math.max(s - 1, 1)) // min back is step 1

  const currentStepMeta = STEPS.find(s => s.id === step) ?? STEPS[0]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Klinq CRM</h1>
          <p className="text-muted-foreground mt-1">Let's get your workspace set up in minutes</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-border -z-10" />
          {STEPS.map((s) => {
            const Icon = s.icon
            const active = step === s.id
            const done = step > s.id
            return (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <div className={`size-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-primary border-primary text-white' :
                  active ? 'bg-background border-primary text-primary' :
                    'bg-background border-border text-muted-foreground'
                  }`}>
                  {done ? <span className="text-xs font-bold">✓</span> : <Icon className="size-3.5" />}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="bg-card border rounded-2xl p-6 shadow-lg">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <currentStepMeta.icon className="size-5 text-primary" />
            {currentStepMeta.label}
          </h2>

          {step === 0 && <Step0 onNext={next} />}
          {step === 1 && <Step1 companyId={companyId} onNext={next} />}
          {step === 2 && <Step2 companyId={companyId} onNext={next} onSkip={next} />}
          {step === 3 && <Step3 onNext={next} />}
          {step === 4 && <Step5 companyId={companyId} onClear={() => {
            try { sessionStorage.removeItem(STORAGE_KEY) } catch { }
          }} />}

          {/* Back button — only for steps 2+ (step 0 & 1 cannot go back to step 0) */}
          {step > 1 && step < 4 && (
            <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={back}>
              <ChevronLeft className="size-4 mr-1" /> Back
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
