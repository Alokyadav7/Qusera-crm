'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/super-admin/ui'
import {
  Building2, User, Mail, Phone, Users, Globe, CheckCircle,
  Copy, ArrowLeft, Loader2, Shield, Terminal
} from 'lucide-react'
import { toast } from 'sonner'

const INDUSTRIES = [
  'Technology', 'Real Estate', 'Finance & Banking', 'Healthcare',
  'Education', 'Retail & E-commerce', 'Manufacturing', 'Consulting',
  'Logistics', 'Media & Marketing', 'Legal', 'Other',
]

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '500+']
const PLANS = ['basic', 'pro', 'enterprise']

interface SuccessData {
  companyName: string
  adminEmail: string
  tempPassword: string
  loginUrl: string
}

export default function OnboardCompanyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    employeeCount: '1-10',
    plan: 'basic',
    customSubdomain: '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName || !form.adminName || !form.adminEmail) {
      toast.error('Company Name, Admin Name and Admin Email are required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Onboarding failed'); return }
      setSuccess(data)
      toast.success('Tenant space provisioned!')
    } catch (e: any) {
      toast.error(e.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`))
  }

  if (success) {
    return (
      <div className="p-8 xl:p-12 max-w-2xl mx-auto space-y-8 relative overflow-hidden">
        {/* Dynamic glow overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 sm:p-10 text-center space-y-6 relative z-10 shadow-2xl shadow-black/50">
          <div className="size-16 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="size-8 text-emerald-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight font-display">Company Onboarded Successfully! 🎉</h2>
            <p className="text-zinc-400 text-xs font-sans max-w-sm mx-auto leading-relaxed">
              Workspace created and credentials transmitted to <span className="font-semibold text-zinc-200">{success.adminEmail}</span>
            </p>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-850 rounded-2xl p-6 text-left space-y-4 shadow-inner">
            <p className="text-zinc-550 text-[10px] font-bold uppercase tracking-wider mb-2">Workspace Manifest</p>

            {[
              { label: 'Company Name', value: success.companyName },
              { label: 'Owner Email', value: success.adminEmail },
              { label: 'Domain Address', value: success.loginUrl },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-4 border-b border-zinc-900/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wide">{item.label}</p>
                  <p className="text-zinc-300 text-xs font-mono mt-0.5">{item.value}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(item.value, item.label)}
                  className="p-2 text-zinc-450 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-all cursor-pointer"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            ))}

            {/* Temporary Password Highlight Box */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-amber-500/80 text-[10px] font-bold uppercase tracking-wider">Temporary Password</p>
                <p className="text-amber-400 text-lg font-mono font-bold tracking-widest mt-0.5">{success.tempPassword}</p>
                <p className="text-amber-600/70 text-[10px] mt-1 font-sans">Provide to owner via alternative channel. Expires in 7 days.</p>
              </div>
              <button
                onClick={() => copyToClipboard(success.tempPassword, 'Temporary Password')}
                className="p-2.5 text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all cursor-pointer shrink-0 border border-amber-500/20"
              >
                <Copy className="size-4.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center pt-2">
            <button
              onClick={() => setSuccess(null)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Onboard Another
            </button>
            <button
              onClick={() => router.push('/super-admin/companies')}
              className="bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-black/10 cursor-pointer"
            >
              All Companies →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputCls = "w-full bg-zinc-950/60 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:ring-2 focus:ring-white/[0.04] focus:border-zinc-700 focus:bg-zinc-950 transition-all duration-200"
  const selectCls = "w-full bg-zinc-950/60 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-zinc-300 placeholder:text-zinc-650 focus:outline-none focus:ring-2 focus:ring-white/[0.04] focus:border-zinc-700 focus:bg-zinc-950 transition-all duration-200"
  const labelCls = "block text-[10px] font-bold text-zinc-450 uppercase tracking-wider mb-1.5"

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[850px] relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute right-[5%] top-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/[0.02] blur-[120px] pointer-events-none" />
      <div className="absolute left-[10%] bottom-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-500/[0.01] blur-[140px] pointer-events-none" />

      {/* Title */}
      <div className="flex items-center gap-4 border-b border-zinc-900 pb-6 relative z-10">
        <button
          onClick={() => router.back()}
          className="p-2 text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            <Shield className="size-3 text-violet-400" />
            <span>Instance Provisioning</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight font-display">Onboard New Company</h1>
          <p className="text-zinc-500 text-xs mt-1">Register a new client company and transmit their administrative workspace node</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {/* Company Info Box */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Building2 className="size-4 text-violet-400" /> 
            <span>Company Setup</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Company Legal Name *</label>
              <input value={form.companyName} onChange={set('companyName')} className={inputCls} placeholder="Acme Corporation Ltd" required />
            </div>

            <div>
              <label className={labelCls}>Industry Vertical</label>
              <select value={form.industry} onChange={set('industry')} className={selectCls}>
                <option value="" className="bg-zinc-950">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i} className="bg-zinc-950">{i}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Employee Size</label>
              <select value={form.employeeCount} onChange={set('employeeCount')} className={selectCls}>
                {EMPLOYEE_RANGES.map(r => <option key={r} value={r} className="bg-zinc-950">{r} employees</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Pricing Tier</label>
              <select value={form.plan} onChange={set('plan')} className={selectCls}>
                {PLANS.map(p => <option key={p} value={p} className="capitalize bg-zinc-950">{p}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Custom Subdomain <span className="text-zinc-600 font-normal">(optional)</span></label>
              <input value={form.customSubdomain} onChange={set('customSubdomain')} className={inputCls} placeholder="acme" />
              {form.customSubdomain && (
                <p className="text-zinc-550 text-[10px] font-mono mt-1.5 flex items-center gap-1.5">
                  <Globe className="size-3.5 text-violet-450" />
                  <span>https://{form.customSubdomain}.klinq.app</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Admin Info Box */}
        <div className="bg-zinc-900/35 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-850 pb-3">
            <User className="size-4 text-violet-400" /> 
            <span>Owner Administrator Details</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Admin Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input value={form.adminName} onChange={set('adminName')} className={inputCls + ' pl-10'} placeholder="Rahul Sharma" required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Admin Primary Email *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input type="email" value={form.adminEmail} onChange={set('adminEmail')} className={inputCls + ' pl-10'} placeholder="owner@acme.com" required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Owner Contact Phone <span className="text-zinc-600 font-normal">(optional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input value={form.adminPhone} onChange={set('adminPhone')} className={inputCls + ' pl-10'} placeholder="+91 99999 99999" />
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-3 shadow-inner">
          <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="size-3.5 text-violet-400" />
            <span>Onboarding Checklist Automation</span>
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-500 text-[11px] list-none">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span>Register clean company row</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span>Form random 12-char credentials</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span>Send secure transactional email</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span>Trace logs on admin system</span>
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-lg shadow-black/[0.08] cursor-pointer"
        >
          {loading ? (
            <><Loader2 className="size-4 animate-spin" />Provisioning instance space...</>
          ) : (
            <><Users className="size-4" />Onboard Workspace & Trigger Email</>
          )}
        </button>
      </form>
    </div>
  )
}
