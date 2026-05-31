"use client"

import { useState } from 'react'
import { Mail, MessageSquare, Clock, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ContactClient() {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    workEmail: '',
    phone: '',
    teamSize: '1-10',
    industry: 'Technology',
    message: ''
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.companyName || !formData.workEmail || !formData.phone) {
      setStatus('error')
      setErrorMessage('Please fill in all required fields.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Failed to submit the request. Please try again.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage('An unexpected error occurred. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-6">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Message sent!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We'll review your requirements and get back to you within 24 hours.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Need urgent assistance?</p>
          <a
            href="https://wa.me/918603058090"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-500 font-bold hover:underline transition-all"
          >
            <MessageSquare className="size-3.5" />
            WhatsApp us: 8603058090
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 py-12 max-w-6xl mx-auto">
      
      {/* Left side: Content */}
      <div className="lg:col-span-5 space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
            Let's get you started
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Fill out the form and we'll get back to you within 24 hours.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded bg-muted/50 border border-border flex items-center justify-center text-foreground">
              <Mail className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email Us</p>
              <a href="mailto:klinqcrm@gmail.com" className="text-xs text-foreground hover:underline font-semibold">
                klinqcrm@gmail.com
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-8 rounded bg-muted/50 border border-border flex items-center justify-center text-foreground">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">WhatsApp Support</p>
              <a href="https://wa.me/918603058090" target="_blank" rel="noopener noreferrer" className="text-xs text-foreground hover:underline font-semibold">
                8603058090
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-8 rounded bg-muted/50 border border-border flex items-center justify-center text-foreground">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Response Time</p>
              <p className="text-xs text-foreground font-semibold">Within 24 hours</p>
            </div>
          </div>
        </div>

        {/* Timeline Workflow */}
        <div className="space-y-4 border-t border-border pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">What happens next</h3>
          
          <div className="space-y-4">
            {[
              { num: '1', title: 'Requirement Review', desc: 'We analyze your workflows and team setup requirements.' },
              { num: '2', title: 'Schedule a Demo Call', desc: 'We walk you through a tailored workspace walkthrough.' },
              { num: '3', title: 'Onboard Company', desc: 'We configure your numbers, teams, RLS and GST billing.' },
              { num: '4', title: 'Team Live', desc: 'Your sales agents are onboarded and start tracking deals.' }
            ].map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="flex items-center justify-center size-5 rounded bg-muted text-[10px] font-bold text-foreground shrink-0 border border-border mt-0.5 select-none">
                  {step.num}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{step.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="lg:col-span-7">
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-xs">
          
          {status === 'error' && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold">Submission Error</p>
                <p>{errorMessage}</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="font-bold underline hover:opacity-80 transition-all cursor-pointer block text-left"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  placeholder="Rahul Sharma"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                  className="w-full bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="companyName" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Company Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  required
                  placeholder="Klinq CRM Pvt Ltd"
                  value={formData.companyName}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                  className="w-full bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="workEmail" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Work Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  id="workEmail"
                  name="workEmail"
                  required
                  placeholder="rahul@company.com"
                  value={formData.workEmail}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                  className="w-full bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                  className="w-full bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="teamSize" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Team Size
                </label>
                <select
                  id="teamSize"
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                  className="w-full bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                >
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="industry" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  disabled={status === 'loading'}
                  className="w-full bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                >
                  <option value="Technology">Technology</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Tell us about your requirements..."
                value={formData.message}
                onChange={handleChange}
                disabled={status === 'loading'}
                className="w-full bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={status === 'loading'}
              className="w-full h-11 bg-foreground text-background font-bold text-sm rounded-lg hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Message</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
