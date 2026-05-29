'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Section } from '@/components/super-admin/ui'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Feature { id: string; key: string; name: string; category: string }
interface Plan { id: string; display_name: string; sort_order: number }
interface PlanFeature { plan_id: string; feature_key: string; is_enabled: boolean }

export default function FeatureFlagsPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null) // "plan_id:feature_key"

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/super-admin/feature-flags/data')
    if (res.ok) {
      const d = await res.json()
      setFeatures(d.features ?? [])
      setPlans(d.plans ?? [])
      setPlanFeatures(d.planFeatures ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function isEnabled(featureKey: string, planId: string): boolean {
    return planFeatures.some(pf => pf.plan_id === planId && pf.feature_key === featureKey && pf.is_enabled)
  }

  async function handleToggle(planId: string, featureKey: string) {
    const key = `${planId}:${featureKey}`
    if (toggling === key) return
    const currentEnabled = isEnabled(featureKey, planId)
    const newEnabled = !currentEnabled

    // Optimistic update
    setPlanFeatures(prev => {
      const existing = prev.find(p => p.plan_id === planId && p.feature_key === featureKey)
      if (existing) {
        return prev.map(p =>
          p.plan_id === planId && p.feature_key === featureKey
            ? { ...p, is_enabled: newEnabled }
            : p
        )
      }
      return [...prev, { plan_id: planId, feature_key: featureKey, is_enabled: newEnabled }]
    })

    setToggling(key)
    try {
      const res = await fetch('/api/super-admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, feature_key: featureKey, enabled: newEnabled }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save')
      }

      toast.success(`Feature "${featureKey}" ${newEnabled ? 'enabled' : 'disabled'}`)
    } catch (e: any) {
      // Revert optimistic update
      setPlanFeatures(prev =>
        prev.map(p =>
          p.plan_id === planId && p.feature_key === featureKey
            ? { ...p, is_enabled: currentEnabled }
            : p
        )
      )
      toast.error(e.message ?? 'Failed to save — try again')
    } finally {
      setToggling(null)
    }
  }

  const categories = [...new Set(features.map(f => f.category))]

  return (
    <div className="p-6 max-w-[1400px]">
      <PageHeader
        title="Feature Flags"
        subtitle="Click any toggle to enable or disable a feature per plan — saves instantly"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-white/30" />
        </div>
      ) : features.length === 0 ? (
        <Section>
          <div className="py-12 text-center text-white/25 text-sm">
            No feature definitions found. Run the feature-flags SQL migration first.
          </div>
        </Section>
      ) : (
        <Section>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[11px] text-white/30 font-medium uppercase tracking-wide w-64">
                    Feature
                  </th>
                  {plans.map(plan => (
                    <th
                      key={plan.id}
                      className="px-4 py-3 text-center text-[11px] text-white/30 font-medium uppercase tracking-wide min-w-[100px]"
                    >
                      {plan.display_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <>
                    <tr key={`cat-${category}`} className="border-t border-white/[0.04]">
                      <td colSpan={plans.length + 1} className="px-4 py-2">
                        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                          {category}
                        </span>
                      </td>
                    </tr>
                    {features.filter(f => f.category === category).map(feature => (
                      <tr
                        key={feature.id}
                        className="border-t border-white/[0.04] hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-2.5">
                          <div>
                            <p className="text-white/70 text-xs font-medium">{feature.name}</p>
                            <p className="text-white/25 text-[11px] font-mono">{feature.key}</p>
                          </div>
                        </td>
                        {plans.map(plan => {
                          const enabled = isEnabled(feature.key, plan.id)
                          const tKey = `${plan.id}:${feature.key}`
                          const isSaving = toggling === tKey

                          return (
                            <td key={plan.id} className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => handleToggle(plan.id, feature.key)}
                                disabled={isSaving}
                                title={enabled ? 'Click to disable' : 'Click to enable'}
                                className={`
                                  relative inline-flex size-8 items-center justify-center rounded-md
                                  border transition-all duration-150 cursor-pointer
                                  ${enabled
                                    ? 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                  }
                                  ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                              >
                                {isSaving ? (
                                  <Loader2 className="size-3 animate-spin text-white/50" />
                                ) : enabled ? (
                                  <span className="size-2.5 rounded-full bg-emerald-500 block" />
                                ) : (
                                  <span className="size-2.5 rounded-full bg-white/15 block" />
                                )}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
