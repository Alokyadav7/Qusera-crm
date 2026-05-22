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
  { key: 'new', label: 'New', color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
  { key: 'interested', label: 'Interested', color: 'bg-cyan-500' },
  { key: 'verified', label: 'Verified', color: 'bg-emerald-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-500' },
  { key: 'closed_won', label: 'Won', color: 'bg-green-500' },
  { key: 'closed_lost', label: 'Lost', color: 'bg-red-500' }
] as const

export function PipelineChart({ data }: PipelineChartProps) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0)
  const maxCount = Math.max(...Object.values(data), 1)

  const winRate = total > 0 ? Math.round((data.closed_won / total) * 100) : 0
  const activeLeads = data.new + data.contacted + data.interested + data.verified + data.negotiation

  return (
    <Card className="glass-card flex flex-col h-full card-hover border-border/50 shadow-sm shadow-primary/5">
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
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
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
              <p className="text-2xl font-bold text-blue-600">{activeLeads}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{data.closed_won}</p>
              <p className="text-xs text-muted-foreground">Won</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{winRate}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
