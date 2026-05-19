'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Zap, Building2, Target, CheckCircle2, ChevronRight, Loader2, Globe, Phone } from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Company Info', desc: 'Tell us about your business' },
  { id: 2, title: 'Sales Setup',  desc: 'Configure your pipeline' },
  { id: 3, title: "You're Ready!", desc: 'Start closing deals' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ company_name: '', industry: '', team_size: '', phone: '', website: '', currency: 'INR' })
  const set = (k: string, v: string) => { setFormError(''); setForm(p => ({ ...p, [k]: v })) }

  async function finish() {
    if (!form.company_name.trim()) { setFormError('Company name is required'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, ...form,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    if (error && error.code !== '42P01') {
      toast.error('Setup failed: ' + error.message)
      setLoading(false)
      return
    }
    toast.success('Welcome to OrbitCRM! 🚀')
    router.push('/dashboard')
  }

  function handleContinue() {
    if (step === 1 && !form.company_name.trim()) {
      setFormError('Please enter your company name to continue')
      return
    }
    setFormError('')
    setStep(s => s + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Zap className="size-6" />
            </div>
            <span className="text-2xl font-bold">OrbitCRM</span>
          </div>
          <h1 className="text-3xl font-bold">Set up your workspace</h1>
          <p className="text-muted-foreground mt-1">Takes less than 2 minutes</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                step > s.id ? 'bg-emerald-500 text-white' :
                step === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s.id ? <CheckCircle2 className="size-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-10 ${step > s.id ? 'bg-emerald-500' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{STEPS[step - 1].title}</CardTitle>
            <CardDescription>{STEPS[step - 1].desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Company Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className={`pl-9 ${formError ? 'border-destructive ring-destructive focus-visible:ring-destructive' : ''}`}
                      placeholder="e.g. Sharma Enterprises"
                      value={form.company_name}
                      onChange={e => set('company_name', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleContinue()}
                      autoFocus
                    />
                  </div>
                  {formError && (
                    <p className="text-xs text-destructive flex items-center gap-1 animate-in slide-in-from-top-1">
                      ⚠ {formError}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Industry</Label>
                    <Select value={form.industry} onValueChange={v => set('industry', v)}>
                      <SelectTrigger><SelectValue placeholder="Industry" /></SelectTrigger>
                      <SelectContent>
                        {['SaaS','Real Estate','Manufacturing','Retail','Finance','Healthcare','Education','Other'].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Team Size</Label>
                    <Select value={form.team_size} onValueChange={v => set('team_size', v)}>
                      <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                      <SelectContent>
                        {['Just me','2-5','6-15','16-50','50+'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Phone</Label>
                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Website</Label>
                    <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="yourcompany.com" value={form.website} onChange={e => set('website', e.target.value)} /></div>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2"><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => set('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ Indian Rupee</SelectItem>
                      <SelectItem value="USD">$ US Dollar</SelectItem>
                      <SelectItem value="AED">د.إ UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-2"><Target className="size-4 text-primary" />What's included:</p>
                  {['AI lead scoring','Real-time Supabase data','Voice note → CRM extraction','WhatsApp & Email from CRM','GST/PAN compliance tracking','Razorpay payment integration'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-emerald-500 shrink-0" />{f}</div>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <div className="text-center py-4 space-y-4">
                <div className="text-5xl">🚀</div>
                <div>
                  <h3 className="text-xl font-bold">You're set, {form.company_name || 'there'}!</h3>
                  <p className="text-muted-foreground mt-1 text-sm">Your OrbitCRM workspace is ready. Start closing deals.</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => step > 1 && setStep(s => s - 1)} disabled={step === 1}>Back</Button>
              {step < 3
                ? <Button onClick={handleContinue}>
                    Continue <ChevronRight className="size-4 ml-1" />
                  </Button>
                : <Button onClick={finish} disabled={loading} className="px-8">
                    {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                    {loading ? 'Setting up…' : 'Go to Dashboard →'}
                  </Button>
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
