'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Loader2, Sparkles, Shield, Send } from 'lucide-react'
import { toast } from 'sonner'

interface FormField {
  key: string
  label: string
  type: string
  required: boolean
}

interface FormConfig {
  id: string
  name: string
  description: string
  fields: FormField[]
}

export default function PublicLeadCaptureFormPage() {
  const params = useParams()
  const slug = params.slug as string

  const [form, setForm] = useState<FormConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})

  const fetchForm = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('lead_forms')
        .select('id, name, description, fields')
        .eq('public_slug', slug)
        .eq('is_published', true)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setForm(null)
      } else {
        setForm(data as FormConfig)
        // Initialize default empty values
        const initial: Record<string, string> = {}
        data.fields.forEach((f: FormField) => {
          initial[f.key] = ''
        })
        setFormData(initial)
      }
    } catch (err: any) {
      toast.error('Error fetching form: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchForm()
  }, [fetchForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return

    // 1. Client side validation
    for (const field of form.fields) {
      if (field.required && !formData[field.key]?.trim()) {
        toast.error(`"${field.label}" is required`)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          data: formData,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Submission failed')

      setSubmitted(true)
      toast.success('Information submitted successfully!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-violet-400 animate-spin" />
          <p className="text-zinc-500 text-xs font-medium">Loading form details...</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="size-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">⚠️</span>
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Form not found</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            This capture form has been deactivated, deleted, or the URL slug is incorrect.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between py-12 px-4 relative overflow-hidden">
      {/* Decorative ambient spots */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-violet-600/[0.04] blur-[100px] pointer-events-none" />

      <main className="flex-1 flex items-center justify-center max-w-lg w-full mx-auto relative z-10">
        <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="size-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 animate-bounce">
                <CheckCircle2 className="size-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">Thank You!</h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                Your submission was captured successfully. A representative will get in touch with you shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Form Title & Head */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <Sparkles className="size-3 text-violet-400" /> Secure Entry
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white">{form.name}</h1>
                {form.description && (
                  <p className="text-zinc-500 text-xs leading-relaxed">{form.description}</p>
                )}
              </div>

              {/* Form inputs */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {form.fields.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.required ? `Required` : `Optional`}
                      value={formData[field.key] || ''}
                      onChange={e => handleInputChange(field.key, e.target.value)}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-white text-zinc-950 hover:bg-zinc-100 disabled:opacity-50 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4" /> Submit Request
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-6 relative z-10 flex flex-col items-center gap-2">
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Shield className="size-3 text-zinc-700" /> All transmissions are fully encrypted under SSL.
        </p>
        <p className="text-[11px] font-bold text-zinc-500 tracking-tight">
          Powered by <span className="text-white font-extrabold">Klinq CRM</span>
        </p>
      </footer>
    </div>
  )
}
