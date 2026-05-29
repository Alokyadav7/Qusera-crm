'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  FileCode, Plus, Globe, Settings, Eye, Trash2, Copy, Check, Loader2,
  X, Sparkles, AlertCircle, ArrowUpRight, BarChart
} from 'lucide-react'

interface LeadForm {
  id: string
  name: string
  description: string
  is_published: boolean
  public_slug: string
  fields: Array<{ key: string; label: string; type: string; required: boolean }>
  submit_count: number
  created_at: string
}

export default function LeadFormsAdminPage() {
  const [forms, setForms] = useState<LeadForm[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [fields, setFields] = useState([
    { key: 'full_name', label: 'Full Name', type: 'text', required: true },
    { key: 'email', label: 'Email Address', type: 'email', required: true },
    { key: 'phone', label: 'Phone Number', type: 'tel', required: false },
    { key: 'company', label: 'Company Name', type: 'text', required: false },
  ])

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('lead_forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setForms((data ?? []) as LeadForm[])
    } catch (err: any) {
      toast.error('Failed to load lead forms: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const handleCreate = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      toast.error('Form name and slug are required')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: member } = await (supabase as any)
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (!member?.company_id) throw new Error('Company context not found')

      const companyId = member.company_id

      const { error } = await (supabase as any)
        .from('lead_forms')
        .insert({
          company_id: companyId,
          created_by: user.id,
          name: formName.trim(),
          description: formDesc.trim(),
          public_slug: formSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          fields,
          is_published: true,
        })

      if (error) throw error
      toast.success('Lead form created & published! 🚀')
      setFormName('')
      setFormDesc('')
      setFormSlug('')
      setShowCreate(false)
      fetchForms()
    } catch (err: any) {
      toast.error('Failed to create lead form: ' + err.message)
    }
  }

  const handleCopyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/forms/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('Form link copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('lead_forms')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Form deleted')
      setForms(prev => prev.filter(f => f.id !== id))
    } catch (err: any) {
      toast.error('Failed to delete form: ' + err.message)
    }
  }

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[1200px] relative">
      {/* Background glow */}
      <div className="absolute right-0 top-0 w-[400px] h-[400px] rounded-full bg-violet-600/[0.03] blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            <Globe className="size-3 text-violet-400" />
            <span>Integrations</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Lead Capture Forms</h1>
          <p className="text-zinc-500 text-xs mt-1">Generate beautiful standalone forms or embeds to capture incoming web prospects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-white text-zinc-950 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> Create Form
        </button>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map(i => (
            <div key={i} className="h-44 bg-zinc-900/30 border border-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-20 border border-zinc-800/40 rounded-2xl bg-zinc-900/10">
          <FileCode className="size-8 text-zinc-700 mx-auto mb-2" />
          <h3 className="text-white font-bold text-sm">No capture forms created yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Create inbound lead generation workflows by designing shareable contact pages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {forms.map(form => (
            <div
              key={form.id}
              className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    Published
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                    <BarChart className="size-3 text-zinc-600" />
                    <span>{form.submit_count || 0} entries</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{form.name}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2 mb-4">{form.description || 'No description.'}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(form.public_slug, form.id)}
                  className="flex-1 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedId === form.id ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" /> Copied link
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy Link
                    </>
                  )}
                </button>
                <a
                  href={`/forms/${form.public_slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="size-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                  title="View Live Form"
                >
                  <ArrowUpRight className="size-4" />
                </a>
                <button
                  onClick={() => handleDelete(form.id)}
                  className="size-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
                  title="Delete Form"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-4">Create Lead Capture Form</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Form Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Inbound Inquiry"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Public Custom URL Slug *</label>
                <input
                  type="text"
                  placeholder="e.g. contact-inbound"
                  value={formSlug}
                  onChange={e => setFormSlug(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Tell prospects what happens next"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 text-xs font-semibold bg-zinc-800 text-white rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2 text-xs font-bold bg-white text-zinc-950 rounded-xl transition-all cursor-pointer"
              >
                Publish Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
