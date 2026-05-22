'use client'

import { MessageSquare, Mic, Phone, Mail, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'

function getInteractionIcon(type: string) {
  switch (type) {
    case 'voice': return <Mic className="size-4" />
    case 'whatsapp': return <MessageSquare className="size-4" />
    case 'call': return <Phone className="size-4" />
    case 'email': return <Mail className="size-4" />
    default: return <MessageSquare className="size-4" />
  }
}

function getInteractionTypeLabel(type: string) {
  const map: Record<string, string> = {
    voice: 'Voice Note', whatsapp: 'WhatsApp', call: 'Phone Call',
    email: 'Email', image: 'Image', meeting: 'Meeting',
  }
  return map[type] || 'Message'
}

function getSentimentLabel(score: number): string {
  if (score >= 0.6) return 'Very Positive'
  if (score >= 0.3) return 'Positive'
  if (score >= -0.3) return 'Neutral'
  if (score >= -0.6) return 'Negative'
  return 'Very Negative'
}

function getSentimentColor(score: number): string {
  if (score >= 0.6) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30'
  if (score >= 0.3) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30'
  if (score >= -0.3) return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
  if (score >= -0.6) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30'
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/30'
}

// Now self-contained with real-time Supabase subscription
export function RecentInteractions({ interactions: _unused }: { interactions?: unknown[] }) {
  const { interactions, isLoading } = useRealtimeInteractions()

  const recentInteractions = [...interactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <Card className="glass-card flex flex-col h-full card-hover border-border/50 shadow-sm shadow-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-5 text-primary" />
          Recent Interactions
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/interactions">View All</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentInteractions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No interactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start communicating with your leads</p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/dashboard/voice">
                <Mic className="size-4 mr-1" />
                Record Voice Note
              </Link>
            </Button>
          </div>
        ) : (
          recentInteractions.map((interaction) => (
            <div
              key={interaction.id}
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className={`flex size-9 items-center justify-center rounded-lg ${
                interaction.type === 'voice' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50' :
                interaction.type === 'whatsapp' ? 'bg-green-100 text-green-600 dark:bg-green-900/50' :
                'bg-blue-100 text-blue-600 dark:bg-blue-900/50'
              }`}>
                {getInteractionIcon(interaction.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {interaction.lead?.full_name || 'Unknown Lead'}
                  </span>
                  <span className={`flex size-4 items-center justify-center rounded-full ${
                    interaction.direction === 'inbound' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50'
                  }`}>
                    {interaction.direction === 'inbound'
                      ? <ArrowDownLeft className="size-2.5 text-blue-600 dark:text-blue-400" />
                      : <ArrowUpRight className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                    }
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getInteractionTypeLabel(interaction.type)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {interaction.content_transcribed || interaction.content_raw || 'No content'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {interaction.sentiment_score !== null && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${getSentimentColor(interaction.sentiment_score)}`}
                    >
                      {getSentimentLabel(interaction.sentiment_score)}
                    </Badge>
                  )}
                  {interaction.ai_extracted_data?.nextAction != null && (
                    <Badge variant="secondary" className="text-xs">
                      Action: {String(interaction.ai_extracted_data.nextAction)}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
