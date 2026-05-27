'use client'

import { Phone, MessageSquare, Flame, AlertTriangle, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Lead {
  id: string
  full_name: string
  company: string | null
  buying_intent: 'high' | 'medium' | 'low'
  sentiment_score: number
  ai_summary: string | null
  estimated_budget: number | null
  status: string
}

interface LeadPriorityListProps {
  leads: Lead[]
}

function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`
  }
  return `₹${amount}`
}

function getSentimentIcon(score: number) {
  if (score >= 0.6) return <Flame className="size-4 text-muted-foreground" />
  if (score <= -0.3) return <AlertTriangle className="size-4 text-muted-foreground" />
  return <Clock className="size-4 text-muted-foreground" />
}

function getSentimentLabel(score: number): string {
  if (score >= 0.6) return 'Very Positive'
  if (score >= 0.3) return 'Positive'
  if (score >= -0.3) return 'Neutral'
  if (score >= -0.6) return 'Negative'
  return 'Very Negative'
}

function getSentimentColor(score: number): string {
  return 'text-muted-foreground bg-muted/40 border border-border'
}

function getIntentBadge(intent: string) {
  switch (intent) {
    case 'high':   return <Badge variant="outline" className="font-medium">High Intent</Badge>
    case 'medium': return <Badge variant="outline" className="font-medium text-muted-foreground">Med Intent</Badge>
    case 'low':    return <Badge variant="outline" className="font-medium text-muted-foreground">Low Intent</Badge>
    default:       return null
  }
}

export function LeadPriorityList({ leads }: LeadPriorityListProps) {
  // Sort leads by intent and sentiment
  const priorityLeads = [...leads]
    .filter(lead => lead.status !== 'closed_won' && lead.status !== 'closed_lost')
    .sort((a, b) => {
      const intentOrder = { high: 0, medium: 1, low: 2 }
      const intentDiff = intentOrder[a.buying_intent] - intentOrder[b.buying_intent]
      if (intentDiff !== 0) return intentDiff
      return Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score)
    })
    .slice(0, 5)

  return (
    <Card className="col-span-1 flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-5 text-muted-foreground" />
          Priority Leads
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/leads">View All</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {priorityLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No leads yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first lead to get started</p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/dashboard/leads">Add Lead</Link>
            </Button>
          </div>
        ) : (
          priorityLeads.map((lead, index) => (
            <div 
              key={lead.id}
              className="group relative flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                #{index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{lead.full_name}</span>
                  {getSentimentIcon(lead.sentiment_score)}
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {lead.company || 'Individual'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {getIntentBadge(lead.buying_intent)}
                  <Badge variant="outline" className={`text-xs ${getSentimentColor(lead.sentiment_score)}`}>
                    {getSentimentLabel(lead.sentiment_score)}
                  </Badge>
                </div>
                {lead.ai_summary && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                    &ldquo;{lead.ai_summary}&rdquo;
                  </p>
                )}
                {lead.estimated_budget && (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Budget: {formatIndianCurrency(lead.estimated_budget)}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="size-8">
                  <Phone className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8">
                  <MessageSquare className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
