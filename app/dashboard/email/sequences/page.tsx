'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Mail, Plus, Play, Pause, Trash2, Clock, Users, ChevronRight, Loader2, ArrowLeft,
  Settings, MessageSquare, AlertCircle, Edit, Save, Send, X
} from 'lucide-react'

interface Sequence {
  id: string
  name: string
  description: string
  is_active: boolean
  trigger_type: string
  created_at: string
}

interface Step {
  id: string
  step_number: number
  delay_hours: number
  subject: string
  body_html: string
}

interface Enrollment {
  id: string
  lead: {
    full_name: string
    email: string
  }
  current_step: number
  status: string
  next_send_at: string
}

export default function EmailSequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form states for creating new sequence
  const [newSeqName, setNewSeqName] = useState('')
  const [newSeqDesc, setNewSeqDesc] = useState('')
  const [newSeqTrigger, setNewSeqTrigger] = useState('manual')

  // Editing state for steps
  const [editingStep, setEditingStep] = useState<Step | null>(null)

  const fetchSequences = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('email_sequences')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSequences(data ?? [])
    } catch (err: any) {
      toast.error('Failed to load sequences: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSequences()
  }, [fetchSequences])

  const loadSequenceDetails = async (seq: Sequence) => {
    setSelectedSequence(seq)
    setLoadingDetails(true)
    try {
      const supabase = createClient()

      // 1. Fetch steps
      const { data: stepData, error: stepErr } = await (supabase as any)
        .from('email_sequence_steps')
        .select('*')
        .eq('sequence_id', seq.id)
        .order('step_number', { ascending: true })

      if (stepErr) throw stepErr
      setSteps(stepData ?? [])

      // 2. Fetch enrollments
      const { data: enrollData, error: enrollErr } = await (supabase as any)
        .from('email_sequence_enrollments')
        .select(`
          id, current_step, status, next_send_at,
          lead:leads(full_name, email)
        `)
        .eq('sequence_id', seq.id)

      if (enrollErr) throw enrollErr
      setEnrollments((enrollData ?? []) as any)
    } catch (err: any) {
      toast.error('Failed to load sequence details: ' + err.message)
    } finally {
      setLoadingDetails(false)
    }
  };

  const handleCreateSequence = async () => {
    if (!newSeqName.trim()) {
      toast.error('Sequence name is required')
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

      const { data, error } = await (supabase as any)
        .from('email_sequences')
        .insert({
          name: newSeqName.trim(),
          description: newSeqDesc.trim(),
          trigger_type: newSeqTrigger,
          company_id: companyId,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      toast.success('Sequence created successfully!')
      setNewSeqName('')
      setNewSeqDesc('')
      setShowCreateModal(false)
      fetchSequences()
      if (data) loadSequenceDetails(data)
    } catch (err: any) {
      toast.error('Failed to create sequence: ' + err.message)
    }
  }

  const handleToggleActive = async (seq: Sequence) => {
    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('email_sequences')
        .update({ is_active: !seq.is_active })
        .eq('id', seq.id)

      if (error) throw error
      toast.success(seq.is_active ? 'Sequence paused' : 'Sequence activated')
      setSequences(prev => prev.map(s => s.id === seq.id ? { ...s, is_active: !s.is_active } : s))
      if (selectedSequence?.id === seq.id) {
        setSelectedSequence(prev => prev ? { ...prev, is_active: !prev.is_active } : null)
      }
    } catch (err: any) {
      toast.error('Failed to toggle status: ' + err.message)
    }
  }

  const handleAddStep = async () => {
    if (!selectedSequence) return
    try {
      const supabase = createClient()
      const nextStepNum = steps.length + 1

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

      const { data, error } = await (supabase as any)
        .from('email_sequence_steps')
        .insert({
          sequence_id: selectedSequence.id,
          company_id: companyId,
          step_number: nextStepNum,
          delay_hours: 24,
          subject: `Follow up ${nextStepNum}`,
          body_html: `<p>Hi there,</p><p>We wanted to follow up on our last conversation...</p>`,
        })
        .select()
        .single()

      if (error) throw error
      toast.success('Step added successfully!')
      setSteps(prev => [...prev, data])
    } catch (err: any) {
      toast.error('Failed to add step: ' + err.message)
    }
  }

  const handleSaveStep = async (step: Step) => {
    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('email_sequence_steps')
        .update({
          subject: step.subject,
          body_html: step.body_html,
          delay_hours: Number(step.delay_hours),
        })
        .eq('id', step.id)

      if (error) throw error
      toast.success('Step updated!')
      setSteps(prev => prev.map(s => s.id === step.id ? step : s))
      setEditingStep(null)
    } catch (err: any) {
      toast.error('Failed to update step: ' + err.message)
    }
  }

  const handleDeleteStep = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('email_sequence_steps')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Step removed')
      setSteps(prev => prev.filter(s => s.id !== id))
    } catch (err: any) {
      toast.error('Failed to delete step: ' + err.message)
    }
  }

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[1200px] relative">
      {/* Ambient backgrounds */}
      <div className="absolute right-0 top-0 w-[400px] h-[400px] rounded-full bg-violet-600/[0.03] blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            <Mail className="size-3 text-violet-400" />
            <span>Nurture</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Email Sequences</h1>
          <p className="text-zinc-500 text-xs mt-1">Design multi-step drip campaigns to nurture and automate lead touchpoints</p>
        </div>
        {!selectedSequence && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-white text-zinc-950 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <Plus className="size-4" /> Create Sequence
          </button>
        )}
      </div>

      {/* Main Grid: Left Sequences List, Right Sequence builder */}
      {!selectedSequence ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-zinc-900/30 border border-zinc-800 rounded-2xl animate-pulse" />
            ))
          ) : sequences.length === 0 ? (
            <div className="col-span-full text-center py-20 border border-zinc-800/40 rounded-2xl bg-zinc-900/10">
              <Mail className="size-8 text-zinc-700 mx-auto mb-2" />
              <h3 className="text-white font-bold text-sm">No email sequences created yet</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Start nurturing your prospects automatically by designing your first sequence.
              </p>
            </div>
          ) : (
            sequences.map(seq => (
              <div
                key={seq.id}
                className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest border rounded px-1.5 py-0.5 ${
                      seq.is_active
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-zinc-500 bg-zinc-800 border-zinc-700'
                    }`}>
                      {seq.is_active ? 'Active' : 'Paused'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Trigger: {seq.trigger_type}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{seq.name}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-4">{seq.description || 'No description provided.'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadSequenceDetails(seq)}
                    className="flex-1 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Build Steps <ChevronRight className="size-3" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(seq)}
                    className="size-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                    title={seq.is_active ? 'Pause Campaign' : 'Resume Campaign'}
                  >
                    {seq.is_active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Sequence Detail & Step Builder Interface
        <div className="space-y-6">
          {/* Top Back Action */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
            <button
              onClick={() => setSelectedSequence(null)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-4" /> Back to Sequences
            </button>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedSequence.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {selectedSequence.is_active ? 'Active' : 'Paused'}
              </span>
              <button
                onClick={() => handleToggleActive(selectedSequence)}
                className="bg-white text-zinc-950 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                {selectedSequence.is_active ? 'Pause Sequence' : 'Resume Sequence'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Steps Builder Area */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Sequence Steps ({steps.length})</span>
                <button
                  onClick={handleAddStep}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer ml-2"
                >
                  <Plus className="size-3" /> Add Step
                </button>
              </h2>

              {steps.map((step, idx) => {
                const isEditing = editingStep?.id === step.id
                return (
                  <div
                    key={step.id}
                    className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-white">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                            <Clock className="size-3" />
                            {isEditing ? (
                              <span className="flex items-center gap-1">
                                Delay:
                                <input
                                  type="number"
                                  value={editingStep.delay_hours}
                                  onChange={e => setEditingStep({ ...editingStep, delay_hours: Number(e.target.value) })}
                                  className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1 text-center"
                                />
                                hours
                              </span>
                            ) : (
                              <span>Sends {step.delay_hours}h after previous step</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveStep(editingStep)}
                              className="size-7 rounded-lg text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center cursor-pointer"
                            >
                              <Save className="size-4" />
                            </button>
                            <button
                              onClick={() => setEditingStep(null)}
                              className="size-7 rounded-lg text-zinc-500 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              <X className="size-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingStep(step)}
                              className="size-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
                            >
                              <Edit className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStep(step.id)}
                              className="size-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editingStep.subject}
                            onChange={e => setEditingStep({ ...editingStep, subject: e.target.value })}
                            placeholder="Subject line"
                            className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                          />
                          <textarea
                            value={editingStep.body_html}
                            onChange={e => setEditingStep({ ...editingStep, body_html: e.target.value })}
                            rows={4}
                            placeholder="Body HTML content..."
                            className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-white mb-1"><span className="text-zinc-500 font-medium">Subject:</span> {step.subject}</p>
                          <div
                            className="text-xs text-zinc-400 border border-zinc-800/80 rounded-xl bg-zinc-950/20 p-3 max-h-24 overflow-y-auto leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: step.body_html }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Enrollments Sidebar */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="size-3.5 text-violet-400" />
                <span>Enrolled Leads ({enrollments.length})</span>
              </h3>

              {enrollments.length === 0 ? (
                <p className="text-xs text-zinc-500">No leads currently enrolled in this sequence.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {enrollments.map(en => (
                    <div key={en.id} className="py-2.5 flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs font-bold text-white">{en.lead?.full_name ?? 'Unnamed'}</p>
                        <p className="text-[10px] text-zinc-500">{en.lead?.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
                          Step {en.current_step}
                        </span>
                        <p className="text-[9px] text-zinc-600 mt-1">Status: {en.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-4">New Email Sequence</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Sequence Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Trial Welcome Nurture"
                  value={newSeqName}
                  onChange={e => setNewSeqName(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Nurture users immediately after sign up"
                  value={newSeqDesc}
                  onChange={e => setNewSeqDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Enrollment Trigger</label>
                <select
                  value={newSeqTrigger}
                  onChange={e => setNewSeqTrigger(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="manual">Manual Enrollment Only</option>
                  <option value="lead_created">Lead Created (Automatic)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 text-xs font-semibold bg-zinc-800 text-white rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSequence}
                className="flex-1 py-2 text-xs font-bold bg-white text-zinc-950 rounded-xl transition-all cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
