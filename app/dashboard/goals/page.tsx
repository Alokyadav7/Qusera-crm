'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Target, Plus, Loader2, TrendingUp, X, Edit2, Trophy, AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesGoal {
  id: string
  name: string
  metric: 'revenue' | 'leads_created' | 'deals_closed' | 'calls_made' | 'emails_sent'
  target_value: number
  current_value: number
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  period_start: string
  period_end: string
  user_id: string | null
  is_active: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<SalesGoal['metric'], string> = {
  revenue:       'Revenue (₹)',
  leads_created: 'Leads Created',
  deals_closed:  'Deals Closed',
  calls_made:    'Calls Made',
  emails_sent:   'Emails Sent',
}

const METRIC_UNITS: Record<SalesGoal['metric'], string> = {
  revenue:       '₹',
  leads_created: '',
  deals_closed:  '',
  calls_made:    '',
  emails_sent:   '',
}

function fmtValue(metric: SalesGoal['metric'], val: number): string {
  if (metric === 'revenue') return `₹${val.toLocaleString('en-IN')}`
  return val.toLocaleString('en-IN')
}

function progressPct(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

function progressColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 70)  return 'bg-violet-500'
  if (pct >= 40)  return 'bg-amber-500'
  return 'bg-red-500'
}

function daysLeft(end: string): number {
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

function periodDefault(type: string): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  if (type === 'weekly') {
    const dow = now.getDay()
    const start = new Date(now); start.setDate(now.getDate() - dow)
    const end = new Date(start); end.setDate(start.getDate() + 6)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  if (type === 'monthly') {
    return {
      start: new Date(y, m, 1).toISOString().slice(0, 10),
      end:   new Date(y, m + 1, 0).toISOString().slice(0, 10),
    }
  }
  if (type === 'quarterly') {
    const q = Math.floor(m / 3)
    return {
      start: new Date(y, q * 3, 1).toISOString().slice(0, 10),
      end:   new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10),
    }
  }
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onDelete }: { goal: SalesGoal; onDelete: () => void }) {
  const pct = progressPct(goal.current_value, goal.target_value)
  const left = daysLeft(goal.period_end)
  const done = pct >= 100

  return (
    <div className={`bg-zinc-900/40 border rounded-2xl p-5 transition-all ${done ? 'border-emerald-500/30' : 'border-zinc-800/80'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {done && <Trophy className="size-3.5 text-emerald-400 shrink-0" />}
            <p className="text-sm font-bold text-white truncate">{goal.name}</p>
          </div>
          <p className="text-xs text-zinc-500">{METRIC_LABELS[goal.metric]} · {goal.period_type}</p>
        </div>
        <button
          onClick={onDelete}
          className="size-6 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-2xl font-black text-white">
            {fmtValue(goal.metric, goal.current_value)}
          </span>
          <span className="text-xs text-zinc-500">
            / {fmtValue(goal.metric, goal.target_value)}
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-xs font-bold ${done ? 'text-emerald-400' : 'text-zinc-400'}`}>
            {pct}% {done ? '— Goal Achieved! 🎉' : 'complete'}
          </span>
          <span className="text-[10px] text-zinc-600">
            {left === 0 ? 'Ended' : `${left}d left`}
          </span>
        </div>
      </div>

      {/* Period */}
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
        <span>{new Date(goal.period_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
        <span>→</span>
        <span>{new Date(goal.period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  )
}

// ─── Create goal modal ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  metric: 'revenue' as SalesGoal['metric'],
  target_value: '',
  period_type: 'monthly' as SalesGoal['period_type'],
  period_start: '',
  period_end: '',
}

function CreateGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const defaults = periodDefault(form.period_type)
    setForm(f => ({ ...f, period_start: defaults.start, period_end: defaults.end }))
  }, [form.period_type])

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.target_value || !form.period_start || !form.period_end) {
      toast.error('Fill in all required fields')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await (supabase as any).from('sales_goals').insert({
      name: form.name.trim(),
      metric: form.metric,
      target_value: Number(form.target_value),
      current_value: 0,
      period_type: form.period_type,
      period_start: form.period_start,
      period_end: form.period_end,
      is_active: true,
    })
    setSaving(false)
    if (error) { toast.error('Failed to create goal: ' + error.message); return }
    toast.success('Goal created!')
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Target className="size-5 text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">New Sales Goal</p>
            <p className="text-zinc-500 text-xs">Track team or individual performance</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-600 hover:text-zinc-400 cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Goal Name *</label>
            <input
              type="text"
              placeholder="e.g. Q2 Revenue Target"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Metric *</label>
              <select
                value={form.metric}
                onChange={e => setForm(f => ({ ...f, metric: e.target.value as SalesGoal['metric'] }))}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
              >
                {Object.entries(METRIC_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Target *</label>
              <input
                type="number"
                placeholder={form.metric === 'revenue' ? '500000' : '50'}
                value={form.target_value}
                onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Period *</label>
            <select
              value={form.period_type}
              onChange={e => setForm(f => ({ ...f, period_type: e.target.value as SalesGoal['period_type'] }))}
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer mb-2"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer" />
              <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold text-zinc-950 bg-white hover:bg-zinc-100 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SalesGoalsPage() {
  const [goals, setGoals] = useState<SalesGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('sales_goals')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setGoals((data ?? []) as SalesGoal[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await (supabase as any).from('sales_goals').update({ is_active: false }).eq('id', id)
    toast.success('Goal removed')
    setGoals(g => g.filter(x => x.id !== id))
  }

  // ── Summary stats ─────────────────────────────────────────────
  const achieved = goals.filter(g => progressPct(g.current_value, g.target_value) >= 100).length
  const onTrack  = goals.filter(g => {
    const pct = progressPct(g.current_value, g.target_value)
    return pct >= 70 && pct < 100
  }).length

  return (
    <div className="p-8 xl:p-12 space-y-8 max-w-[1100px] relative">
      {showCreate && (
        <CreateGoalModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchGoals}
        />
      )}

      {/* Ambient */}
      <div className="absolute right-0 top-0 w-[400px] h-[400px] rounded-full bg-violet-600/[0.03] blur-[140px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2">
            <TrendingUp className="size-3 text-violet-400" />
            <span>Performance</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Sales Goals</h1>
          <p className="text-zinc-500 text-xs mt-1">Track revenue targets and activity goals</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-white text-zinc-950 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <Plus className="size-4" /> New Goal
        </button>
      </div>

      {/* Summary stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4 relative z-10">
          {[
            { label: 'Total Goals', value: goals.length, icon: Target, color: 'text-zinc-400' },
            { label: 'Achieved', value: achieved, icon: Trophy, color: 'text-emerald-400' },
            { label: 'On Track', value: onTrack, icon: TrendingUp, color: 'text-violet-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex items-center gap-4">
              <div className="size-10 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                <stat.icon className={`size-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goals grid */}
      <div className="relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <Target className="size-7 text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No sales goals yet</h3>
            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed mb-6">
              Set revenue targets, lead count goals, or activity goals to track your team's performance.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-white text-zinc-950 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <Plus className="size-4" /> Create First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onDelete={() => handleDelete(goal.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Info note */}
      {goals.length > 0 && (
        <div className="relative z-10 flex items-start gap-2.5 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
          <AlertCircle className="size-4 text-zinc-600 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-400">Current values</strong> are manually tracked. After running the{' '}
            <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">weekly-features-migration.sql</code>
            {' '}migration, a cron job can auto-calculate values from deals and leads.
          </p>
        </div>
      )}
    </div>
  )
}
