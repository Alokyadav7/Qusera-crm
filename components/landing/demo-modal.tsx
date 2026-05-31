'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, ArrowRight, Mail, User, Phone, Building2,
  Users, MessageSquare, RefreshCw, CheckCircle2, ChevronLeft
} from 'lucide-react'

type Intent = 'demo' | 'trial'
type Step = 'form' | 'otp' | 'success'

interface DemoModalProps {
  open: boolean
  onClose: () => void
  defaultIntent?: Intent
}

const TEAM_SIZES = ['1–5', '6–15', '16–50', '51–200', '200+']

function InputField({
  label, icon: Icon, required, children
}: {
  label: string
  icon: React.ElementType
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        {children}
      </div>
    </div>
  )
}

const INPUT_CLS = "w-full pl-9 pr-3 py-2.5 bg-muted/20 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-colors"

export function DemoModal({ open, onClose, defaultIntent = 'demo' }: DemoModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [intent, setIntent] = useState<Intent>(defaultIntent)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company_name: '', team_size: '', message: '',
  })
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('form')
      setIntent(defaultIntent)
      setForm({ name: '', email: '', phone: '', company_name: '', team_size: '', message: '' })
      setOtp(['', '', '', '', '', ''])
      setError('')
      setSuccessMsg('')
      setResendCooldown(0)
    }
  }, [open, defaultIntent])

  // Countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // ESC to close + lock body scroll
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, open])

  if (!open) return null

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
    setError('')
  }

  async function handleSendOtp() {
    if (!form.name.trim()) return setError('Please enter your full name.')
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError('Please enter a valid email address.')
    if (!form.phone.trim() || !/^[\d\s\+\-\(\)]{7,15}$/.test(form.phone))
      return setError('Please enter a valid phone number.')

    setLoading(true); setError('')
    try {
      const res = await fetch('/api/demo/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to send OTP. Try again.')
      else { setStep('otp'); setResendCooldown(60); setTimeout(() => otpRefs.current[0]?.focus(), 100) }
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/demo/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to resend OTP.')
      else { setOtp(['', '', '', '', '', '']); setResendCooldown(60); setTimeout(() => otpRefs.current[0]?.focus(), 100) }
    } finally { setLoading(false) }
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[idx] = val; setOtp(next); setError('')
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) { setOtp(text.split('')); otpRefs.current[5]?.focus() }
  }

  async function handleVerifySubmit() {
    const otpString = otp.join('')
    if (otpString.length !== 6) return setError('Enter the complete 6-digit OTP.')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/demo/verify-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, intent, otp: otpString }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Verification failed. Try again.')
      else { setSuccessMsg(data.message); setStep('success') }
    } finally { setLoading(false) }
  }

  return (
    /* Full-screen overlay — flex column on mobile, centered on sm+ */
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal panel
          - On mobile: slides up from bottom, full width, rounded top corners, max 92vh, scrollable
          - On sm+: centered card, max-w-lg, rounded-2xl
      */}
      <div
        className={`
          relative w-full bg-background border border-border shadow-2xl
          flex flex-col
          rounded-t-2xl sm:rounded-2xl
          max-h-[92dvh] sm:max-h-[90vh]
          sm:max-w-lg sm:mx-4
          overflow-hidden
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Top drag handle — visible on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-foreground/80 to-foreground/20 shrink-0" />

        {/* Header — never scrolls */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div className="min-w-0 pr-2">
            {step === 'form' && (
              <>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                  {intent === 'demo' ? '📅 Book a Demo' : '🚀 Free Trial'}
                </p>
                <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-tight">
                  {intent === 'demo' ? 'See KlinqCRM in action' : 'Get started in minutes'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">OTP-verified · No spam, ever.</p>
              </>
            )}
            {step === 'otp' && (
              <>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Step 2 of 2</p>
                <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">Verify your email</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  OTP sent to <span className="font-semibold text-foreground">{form.email}</span>
                </p>
              </>
            )}
            {step === 'success' && (
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">You're all set! 🎉</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">

          {/* ── Step 1: Form ──────────────────────────── */}
          {step === 'form' && (
            <>
              {/* Intent toggle */}
              <div className="flex gap-2 p-1 bg-muted/30 border border-border rounded-lg">
                {(['demo', 'trial'] as Intent[]).map(i => (
                  <button
                    key={i}
                    onClick={() => setIntent(i)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      intent === i ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {i === 'demo' ? '📅 Book a Demo' : '🚀 Free Trial'}
                  </button>
                ))}
              </div>

              {/* Name + Phone — always 2 cols (they're short fields) */}
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Full Name" icon={User} required>
                  <input
                    type="text"
                    placeholder="Ramesh Kumar"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className={INPUT_CLS}
                  />
                </InputField>
                <InputField label="Phone" icon={Phone} required>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className={INPUT_CLS}
                  />
                </InputField>
              </div>

              {/* Email — full width */}
              <InputField label="Work Email" icon={Mail} required>
                <input
                  type="email"
                  placeholder="ramesh@yourcompany.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className={INPUT_CLS}
                />
              </InputField>

              {/* Company + Team — 2 cols */}
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Company" icon={Building2}>
                  <input
                    type="text"
                    placeholder="Acme Pvt Ltd"
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    className={INPUT_CLS}
                  />
                </InputField>
                <InputField label="Team Size" icon={Users}>
                  <select
                    value={form.team_size}
                    onChange={e => set('team_size', e.target.value)}
                    className={`${INPUT_CLS} appearance-none cursor-pointer`}
                  >
                    <option value="">Select</option>
                    {TEAM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </InputField>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Message <span className="normal-case text-muted-foreground/60 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 size-3.5 text-muted-foreground pointer-events-none" />
                  <textarea
                    placeholder="What do you need help with?"
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    rows={2}
                    className={`${INPUT_CLS} resize-none pt-2.5`}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  ⚠️ {error}
                </p>
              )}
            </>
          )}

          {/* ── Step 2: OTP ───────────────────────────── */}
          {step === 'otp' && (
            <>
              <div className="text-center space-y-3 pt-2">
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-muted border border-border mx-auto">
                  <Mail className="size-5 text-foreground" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Check <strong className="text-foreground break-all">{form.email}</strong> for your 6-digit code.
                  <br />
                  <span className="text-xs">Also check your spam/junk folder.</span>
                </p>
              </div>

              {/* OTP boxes — responsive sizing */}
              <div className="flex justify-center gap-1.5 sm:gap-2 py-2" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { otpRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className={`
                      w-10 h-12 sm:w-12 sm:h-14
                      text-center text-lg sm:text-xl font-black
                      rounded-xl border-2 bg-muted/20 text-foreground
                      focus:outline-none transition-all
                      ${digit ? 'border-foreground bg-foreground/5' : 'border-border focus:border-foreground/60'}
                    `}
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                  ⚠️ {error}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { setStep('form'); setError('') }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" /> Back
                </button>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-xs font-semibold text-foreground disabled:text-muted-foreground transition-colors cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Success ───────────────────────── */}
          {step === 'success' && (
            <div className="text-center space-y-4 py-3">
              <div className="inline-flex items-center justify-center size-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 mx-auto">
                <CheckCircle2 className="size-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Request Confirmed!</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {successMsg || `Our team will contact you at ${form.email} within 24 hours.`}
                </p>
              </div>
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-left space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Summary</p>
                {([
                  { label: 'Name', val: form.name },
                  { label: 'Email', val: form.email },
                  { label: 'Type', val: intent === 'demo' ? '📅 Book a Demo' : '🚀 Free Trial' },
                  form.company_name ? { label: 'Company', val: form.company_name } : null,
                ] as any[]).filter(Boolean).map((row: any) => (
                  <div key={row.label} className="flex justify-between text-xs gap-2">
                    <span className="text-muted-foreground shrink-0">{row.label}</span>
                    <span className="text-foreground font-medium text-right truncate">{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sticky footer CTA — never scrolls, always visible */}
        <div className="px-5 py-4 border-t border-border bg-background shrink-0">
          {step === 'form' && (
            <>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 h-11 bg-foreground text-background font-bold text-sm rounded-lg hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading
                  ? <RefreshCw className="size-4 animate-spin" />
                  : <><span>Continue — Verify Email</span><ArrowRight className="size-4" /></>
                }
              </button>
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                We'll send a 6-digit OTP to your email.
              </p>
            </>
          )}
          {step === 'otp' && (
            <button
              onClick={handleVerifySubmit}
              disabled={loading || otp.join('').length !== 6}
              className="w-full flex items-center justify-center gap-2 h-11 bg-foreground text-background font-bold text-sm rounded-lg hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? <RefreshCw className="size-4 animate-spin" />
                : <><CheckCircle2 className="size-4" /><span>Confirm &amp; Submit Request</span></>
              }
            </button>
          )}
          {step === 'success' && (
            <button
              onClick={onClose}
              className="w-full h-11 bg-foreground text-background font-bold text-sm rounded-lg hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
