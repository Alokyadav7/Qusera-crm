'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, User, Mail, Phone, Users, Globe, CheckCircle,
  Copy, ArrowLeft, Loader2, Shield, Terminal, ArrowRight, Check
} from 'lucide-react'
import { toast } from 'sonner'

const INDUSTRIES = [
  'Technology', 'Real Estate', 'Finance & Banking', 'Healthcare',
  'Education', 'Retail & E-commerce', 'Manufacturing', 'Consulting',
  'Logistics', 'Media & Marketing', 'Legal', 'Other',
]

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '500+']

const PLANS = [
  { id: 'basic', name: 'Basic Core', price: '₹4,999', desc: 'Up to 10 users, basic CRM, core SMS support' },
  { id: 'pro', name: 'Pro Enterprise', price: '₹14,999', desc: 'Up to 50 users, advanced AI scoring, SMS & WhatsApp integrations' },
  { id: 'enterprise', name: 'Custom Node', price: '₹39,999', desc: 'Unlimited boundaries, custom features overrides, 24/7 dedicated support' },
]

interface SuccessData {
  companyName: string
  adminEmail: string
  tempPassword: string
  loginUrl: string
  emailSent?: boolean
  emailError?: string
}

export default function OnboardCompanyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    employeeCount: '1-10',
    plan: 'basic',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    customSubdomain: '',
    // Features toggles
    featureVoice: true,
    featureIntegrations: true,
    featureSMS: true,
    featureWhatsApp: false,
    featureAIScoring: false,
  })

  const setVal = (key: string, val: any) => {
    setForm(f => ({ ...f, [key]: val }))
  }

  const handleNext = () => {
    if (step === 1 && !form.companyName) {
      toast.error('Company Legal Name is required')
      return
    }
    if (step === 3 && (!form.adminName || !form.adminEmail)) {
      toast.error('Owner Name and Owner Email are required')
      return
    }
    setStep(s => s + 1)
  }

  const handleBack = () => {
    setStep(s => s - 1)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Onboarding failed')
        return
      }
      setSuccess(data)
      setStep(7)
      toast.success('Tenant space provisioned!')
    } catch (e: any) {
      toast.error(e.message || 'Unexpected error during provisioning')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`))
  }

  const stepsList = [
    'Company Info',
    'Plan Selection',
    'Owner Account',
    'Feature Scope',
    'Branding',
    'Review',
    'Provision'
  ]

  if (success) {
    return (
      <div className="p-6 xl:p-10 max-w-2xl mx-auto space-y-6 bg-black min-h-screen text-zinc-100 selection:bg-zinc-800">
        <div className="bg-zinc-950 border border-zinc-900 rounded p-8 text-center space-y-6">
          <div className="size-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="size-6 text-emerald-400" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Company Onboarded Successfully!</h2>
            <p className="text-zinc-500 text-xs">
              Workspace created and credentials transmitted to <span className="font-semibold text-zinc-300">{success.adminEmail}</span>
            </p>
          </div>

          {/* Email delivery status */}
          {success.emailSent === false && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded p-4 text-left flex items-start gap-3">
              <span className="text-amber-400 text-lg leading-none mt-0.5">⚠️</span>
              <div>
                <p className="text-amber-400 text-xs font-bold">Welcome email could not be delivered</p>
                <p className="text-amber-600/80 text-[10px] mt-1 leading-relaxed">
                  {success.emailError ?? 'SMTP error'} — Please share the credentials below with the owner manually.
                </p>
              </div>
            </div>
          )}
          {success.emailSent === true && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3 text-left flex items-center gap-2">
              <span className="text-emerald-400 text-sm">✉️</span>
              <p className="text-emerald-400 text-xs font-semibold">Welcome email sent successfully to {success.adminEmail}</p>
            </div>
          )}

          <div className="bg-zinc-900/30 border border-zinc-900 rounded p-5 text-left space-y-3.5">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Workspace Manifest</p>

            {[
              { label: 'Company Name', value: success.companyName },
              { label: 'Owner Email', value: success.adminEmail },
              { label: 'Domain Address', value: success.loginUrl },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-4 border-b border-zinc-900/50 pb-2.5 last:border-0 last:pb-0">
                <div>
                  <p className="text-zinc-550 text-[10px] uppercase font-bold tracking-wide">{item.label}</p>
                  <p className="text-zinc-300 text-xs font-mono mt-0.5">{item.value}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(item.value, item.label)}
                  className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800 transition-colors cursor-pointer"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            ))}

            <div className="bg-amber-500/5 border border-amber-500/15 rounded p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-amber-500/80 text-[10px] font-bold uppercase tracking-wider">Temporary Password</p>
                <p className="text-amber-400 text-base font-mono font-bold tracking-widest mt-0.5">{success.tempPassword}</p>
                <p className="text-amber-600/70 text-[9px] mt-1 font-sans">Provide to owner via alternative channel. Expires in 7 days.</p>
              </div>
              <button
                onClick={() => copyToClipboard(success.tempPassword, 'Temporary Password')}
                className="p-2 text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors cursor-pointer border border-amber-500/20"
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setSuccess(null)
                setForm({
                  companyName: '',
                  industry: '',
                  employeeCount: '1-10',
                  plan: 'basic',
                  adminName: '',
                  adminEmail: '',
                  adminPhone: '',
                  customSubdomain: '',
                  featureVoice: true,
                  featureIntegrations: true,
                  featureSMS: true,
                  featureWhatsApp: false,
                  featureAIScoring: false,
                })
                setStep(1)
              }}
              className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Onboard Another
            </button>
            <button
              onClick={() => router.push('/super-admin/companies')}
              className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-4.5 py-2.5 rounded transition-all cursor-pointer"
            >
              All Companies →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputCls = "w-full bg-zinc-950 border border-zinc-900 rounded px-3 py-2 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-zinc-800 transition-colors"
  const selectCls = "w-full bg-zinc-950 border border-zinc-900 rounded px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-800 transition-colors"
  const labelCls = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5"

  return (
    <div className="p-6 xl:p-10 max-w-[850px] bg-black min-h-screen text-zinc-100 selection:bg-zinc-800 relative">
      
      {/* Brand Header */}
      <div className="flex items-center gap-4 border-b border-zinc-900 pb-5">
        <button
          onClick={() => router.back()}
          className="p-2 text-zinc-450 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 rounded transition-all cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
            <Shield className="size-3 text-zinc-350" />
            <span>Instance Provisioning</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-display">Onboard New Company</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Register a new client company and transmit their administrative workspace node</p>
        </div>
      </div>

      {/* 7-Step Progress Horizontal Bar */}
      <div className="py-6 select-none border-b border-zinc-900/60 mb-6">
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none pb-2">
          {stepsList.map((label, idx) => {
            const currentIdx = idx + 1
            const isActive = currentIdx === step
            const isCompleted = currentIdx < step
            return (
              <div key={label} className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                      isActive
                        ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                        : isCompleted
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-350'
                        : 'bg-zinc-950 border-zinc-900 text-zinc-550'
                    }`}
                  >
                    {isCompleted ? <Check className="size-3" /> : currentIdx}
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-wide uppercase transition-colors ${
                      isActive ? 'text-zinc-200' : 'text-zinc-550'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <span className="text-zinc-800 text-[10px] font-light">/</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Contents */}
      <div className="space-y-6">
        {step === 1 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded p-6 space-y-4">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-900">
              <Building2 className="size-4 text-zinc-400" />
              <span>Company Information</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Company Legal Name *</label>
                <input
                  value={form.companyName}
                  onChange={e => setVal('companyName', e.target.value)}
                  className={inputCls}
                  placeholder="Acme Corporation Ltd"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Industry Vertical</label>
                <select
                  value={form.industry}
                  onChange={e => setVal('industry', e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Employee Size</label>
                <select
                  value={form.employeeCount}
                  onChange={e => setVal('employeeCount', e.target.value)}
                  className={selectCls}
                >
                  {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r} employees</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded p-6 space-y-4">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-900">
              <Shield className="size-4 text-zinc-400" />
              <span>Subscription Pricing Tier</span>
            </p>
            <div className="grid grid-cols-1 gap-3">
              {PLANS.map(p => (
                <label
                  key={p.id}
                  onClick={() => setVal('plan', p.id)}
                  className={`flex items-start justify-between gap-4 p-4 rounded border transition-colors cursor-pointer select-none ${
                    form.plan === p.id
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={form.plan === p.id}
                      onChange={() => {}}
                      className="mt-1 accent-white"
                    />
                    <div>
                      <p className="text-zinc-200 text-xs font-bold uppercase tracking-wider">{p.name}</p>
                      <p className="text-zinc-550 text-[10.5px] font-sans mt-0.5 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                  <span className="text-zinc-200 text-xs font-bold font-mono shrink-0">{p.price}<span className="text-zinc-550 font-normal"> / mo</span></span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded p-6 space-y-4">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-900">
              <User className="size-4 text-zinc-400" />
              <span>Primary Admin Owner Accounts</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Owner Full Name *</label>
                <input
                  value={form.adminName}
                  onChange={e => setVal('adminName', e.target.value)}
                  className={inputCls}
                  placeholder="Rahul Sharma"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Admin Primary Email *</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={e => setVal('adminEmail', e.target.value)}
                  className={inputCls}
                  placeholder="owner@company.com"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Owner Contact Phone (optional)</label>
                <input
                  value={form.adminPhone}
                  onChange={e => setVal('adminPhone', e.target.value)}
                  className={inputCls}
                  placeholder="+91 99999 99999"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded p-6 space-y-4">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-900">
              <Terminal className="size-4 text-zinc-400" />
              <span>Feature Access Override Flags</span>
            </p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'featureSMS', label: 'SMS Pipeline Integration', desc: 'Allows sending automated system transactional notifications' },
                { key: 'featureWhatsApp', label: 'WhatsApp Automation Core', desc: 'Enables WhatsApp workflows using Qusera business keys' },
                { key: 'featureVoice', label: 'Interactive Voice calling', desc: 'Integrates corporate VoIP call triggers' },
                { key: 'featureIntegrations', label: 'Third-party Integrations Portal', desc: 'Connects external webhooks and CRM integrations' },
                { key: 'featureAIScoring', label: 'AI Lead Scoring Engine', desc: 'Powers neural predictive scoring scoring indices' },
              ].map(f => (
                <label
                  key={f.key}
                  onClick={() => setVal(f.key, !form[f.key as keyof typeof form])}
                  className={`flex items-start gap-3 p-3 rounded border transition-colors cursor-pointer select-none ${
                    form[f.key as keyof typeof form]
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-zinc-950 border-zinc-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!form[f.key as keyof typeof form]}
                    onChange={() => {}}
                    className="mt-1 accent-white"
                  />
                  <div>
                    <p className="text-zinc-200 text-xs font-bold">{f.label}</p>
                    <p className="text-zinc-550 text-[10px] mt-0.5 font-sans leading-relaxed">{f.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded p-6 space-y-4">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-900">
              <Globe className="size-4 text-zinc-400" />
              <span>Branding & Cluster Subdomain</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Custom Subdomain Slug (optional)</label>
                <input
                  value={form.customSubdomain}
                  onChange={e => setVal('customSubdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className={inputCls}
                  placeholder="acme"
                />
                {form.customSubdomain && (
                  <p className="text-zinc-500 text-[10px] font-mono mt-1.5 flex items-center gap-1.5 select-none">
                    <Globe className="size-3.5 text-zinc-400" />
                    <span>Domain Node: https://{form.customSubdomain}.klinqcrm.in</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="bg-zinc-950 border border-zinc-900 rounded p-6 space-y-5">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-zinc-900">
              <Terminal className="size-4 text-zinc-400" />
              <span>Confirm Tenant Provision Manifest</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="border-b border-zinc-900 pb-2">
                <span className="text-zinc-500 font-medium block">Company Legal Name</span>
                <span className="text-white font-bold block mt-0.5">{form.companyName}</span>
              </div>
              <div className="border-b border-zinc-900 pb-2">
                <span className="text-zinc-500 font-medium block">Pricing Plan Tier</span>
                <span className="text-white font-bold block mt-0.5 uppercase tracking-wider">{form.plan}</span>
              </div>
              <div className="border-b border-zinc-900 pb-2">
                <span className="text-zinc-500 font-medium block">Owner Admin Name</span>
                <span className="text-white font-bold block mt-0.5">{form.adminName}</span>
              </div>
              <div className="border-b border-zinc-900 pb-2">
                <span className="text-zinc-500 font-medium block">Primary Owner Email</span>
                <span className="text-white font-bold block mt-0.5 font-mono">{form.adminEmail}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-zinc-500 font-medium block">Active Overrides Flags</span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {Object.entries(form)
                    .filter(([k, v]) => k.startsWith('feature') && v === true)
                    .map(([k]) => (
                      <span key={k} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-[9px] font-bold uppercase tracking-wider">
                        {k.replace('feature', '')}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        {step < 7 && (
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-900/60">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-xs font-bold px-4 py-2 rounded transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                Back Step
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-4.5 py-2.5 rounded transition-all cursor-pointer ml-auto"
              >
                Next Step
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-5 py-2.5 rounded transition-all disabled:opacity-50 ml-auto cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="size-3.5 animate-spin" />Provisioning...</>
                ) : (
                  <><CheckCircle className="size-3.5" />Provision Workspace</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
