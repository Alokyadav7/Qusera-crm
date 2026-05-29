'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, X, Plus } from 'lucide-react'

interface FeatureOverride {
  id: string
  feature_key: string
  is_enabled: boolean
  reason: string | null
  expires_at: string | null
}

interface Props {
  companyId: string
  overrides: FeatureOverride[]
}

const COMMON_FEATURES = [
  { key: 'ai_lead_scoring', label: 'AI Lead Scoring' },
  { key: 'whatsapp_messaging', label: 'WhatsApp Messaging' },
  { key: 'bulk_import', label: 'Bulk Import' },
  { key: 'api_access', label: 'API Access' },
  { key: 'advanced_reports', label: 'Advanced Reports' },
  { key: 'custom_domain', label: 'Custom Domain' },
  { key: 'sso', label: 'Single Sign-On' },
  { key: 'audit_logs', label: 'Audit Logs' },
]

export function FeatureFlagToggles({ companyId, overrides }: Props) {
  const [localOverrides, setLocalOverrides] = useState<FeatureOverride[]>(overrides)
  const [loading, setLoading] = useState<string | null>(null)

  function getOverride(key: string): FeatureOverride | undefined {
    return localOverrides.find(o => o.feature_key === key)
  }

  async function toggle(featureKey: string, enable: boolean) {
    setLoading(featureKey)
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey, isEnabled: enable }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      // Update local state
      setLocalOverrides(prev => {
        const existing = prev.find(o => o.feature_key === featureKey)
        if (existing) {
          return prev.map(o => o.feature_key === featureKey ? { ...o, is_enabled: enable } : o)
        }
        return [...prev, { id: Date.now().toString(), feature_key: featureKey, is_enabled: enable, reason: 'Manual override', expires_at: null }]
      })

      toast.success(`${featureKey} ${enable ? 'enabled' : 'disabled'} for this company`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="divide-y divide-white/[0.05]">
      {COMMON_FEATURES.map(feature => {
        const override = getOverride(feature.key)
        const isEnabled = override?.is_enabled ?? null
        const isLoading = loading === feature.key

        return (
          <div key={feature.key} className="px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs">{feature.label}</p>
              <p className="text-white/20 text-[10px] font-mono">{feature.key}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {override && (
                <span className="text-[10px] text-amber-500/60">override</span>
              )}
              {isLoading ? (
                <Loader2 className="size-4 animate-spin text-white/30" />
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => toggle(feature.key, true)}
                    className={`p-1 rounded transition-colors ${
                      isEnabled === true
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                    title="Enable"
                  >
                    <Check className="size-3" />
                  </button>
                  <button
                    onClick={() => toggle(feature.key, false)}
                    className={`p-1 rounded transition-colors ${
                      isEnabled === false
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-white/20 hover:text-red-400 hover:bg-red-500/10'
                    }`}
                    title="Disable"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
