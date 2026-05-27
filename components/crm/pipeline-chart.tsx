'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface PipelineData {
  new: number
  contacted: number
  interested: number
  verified: number
  negotiation: number
  closed_won: number
  closed_lost: number
}

interface PipelineChartProps {
  data: PipelineData
}

const stages = [
  { key: 'new',        label: 'New',         opacity: 'opacity-40' },
  { key: 'contacted',  label: 'Contacted',   opacity: 'opacity-50' },
  { key: 'interested', label: 'Interested',  opacity: 'opacity-60' },
  { key: 'verified',   label: 'Verified',    opacity: 'opacity-70' },
  { key: 'negotiation',label: 'Negotiation', opacity: 'opacity-80' },
  { key: 'closed_won', label: 'Won',         opacity: 'opacity-100' },
  { key: 'closed_lost',label: 'Lost',        opacity: 'opacity-20' },
] as const

export function PipelineChart({ data }: PipelineChartProps) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0)
  const maxCount = Math.max(...Object.values(data), 1)

  const winRate = total > 0 ? Math.round((data.closed_won / total) * 100) : 0
  const activeLeads = data.new + data.contacted + data.interested + data.verified + data.negotiation

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sales Pipeline</CardTitle>
        <CardDescription>
          {total > 0
            ? `${total} total leads across all stages`
            : 'No leads in pipeline yet'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage) => {
            const count = data[stage.key]
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0

            return (
              <div key={stage.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-foreground transition-all duration-500 ${stage.opacity}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{activeLeads}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data.closed_won}</p>
              <p className="text-xs text-muted-foreground">Won</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{winRate}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
