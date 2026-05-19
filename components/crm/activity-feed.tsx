'use client'

import { Mail, Phone, DollarSign, Bell, Star, MessageSquare, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Interaction } from '@/hooks/use-realtime-interactions'

// Map Supabase interaction type → display config
const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string; label: string }> = {
  email:    { icon: Mail,          bg: 'bg-blue-100 dark:bg-blue-900/30',      color: 'text-blue-600 dark:text-blue-400',      label: 'Email'    },
  call:     { icon: Phone,         bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400', label: 'Call'     },
  whatsapp: { icon: MessageSquare, bg: 'bg-green-100 dark:bg-green-900/30',    color: 'text-green-600 dark:text-green-400',    label: 'WhatsApp' },
  voice:    { icon: Phone,         bg: 'bg-violet-100 dark:bg-violet-900/30',  color: 'text-violet-600 dark:text-violet-400',  label: 'Voice'    },
  text:     { icon: DollarSign,    bg: 'bg-pink-100 dark:bg-pink-900/30',      color: 'text-pink-600 dark:text-pink-400',      label: 'Text'     },
  image:    { icon: Bell,          bg: 'bg-amber-100 dark:bg-amber-900/30',    color: 'text-amber-600 dark:text-amber-400',    label: 'Image'    },
  meeting:  { icon: Star,          bg: 'bg-indigo-100 dark:bg-indigo-900/30',  color: 'text-indigo-600 dark:text-indigo-400',  label: 'Meeting'  },
}

function getFallbackConfig() {
  return { icon: MessageSquare, bg: 'bg-muted', color: 'text-muted-foreground', label: 'Activity' }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function buildTitle(interaction: Interaction): string {
  const dir = interaction.direction === 'inbound' ? 'Received' : 'Sent'
  const typeLbl = (TYPE_CONFIG[interaction.type] || getFallbackConfig()).label
  return `${typeLbl} ${dir}`
}

function buildDescription(interaction: Interaction): string {
  const raw = interaction.content_transcribed || interaction.content_raw
  if (raw) return raw.slice(0, 100) + (raw.length > 100 ? '…' : '')
  if (interaction.ai_extracted_data) {
    const d = interaction.ai_extracted_data as Record<string, unknown>
    if (typeof d.summary === 'string') return d.summary.slice(0, 100)
  }
  return `${interaction.direction} ${interaction.type} interaction`
}

interface ActivityFeedProps {
  interactions: Interaction[]
  isLoading: boolean
  onAIAction?: (prompt: string, context: string) => void
}

export function ActivityFeed({ interactions, isLoading, onAIAction }: ActivityFeedProps) {
  function summarizeAll() {
    const summary = interactions.slice(0, 10).map(i =>
      `[${timeAgo(i.created_at)}] ${i.type} (${i.direction}): ${buildDescription(i)} — Contact: ${i.lead?.full_name || 'Unknown'}`
    ).join('\n')
    const ctx = `Recent CRM activity feed (${interactions.length} total interactions):\n${summary}`
    const prompt = `Analyze my recent CRM activity feed and provide: 1) Key patterns you notice, 2) Which leads need immediate follow-up, 3) Recommended priority actions for today.`
    onAIAction?.(prompt, ctx)
  }

  function activityAI(interaction: Interaction) {
    const desc = buildDescription(interaction)
    const contact = interaction.lead?.full_name || 'Unknown Contact'
    const ctx = `Activity: ${buildTitle(interaction)} | Type: ${interaction.type} | Direction: ${interaction.direction} | Contact: ${contact} | Details: ${desc} | Time: ${timeAgo(interaction.created_at)}`
    const prompts: Record<string, string> = {
      email:    `Based on this email activity with ${contact} ("${desc}"), what should my next response or action be?`,
      call:     `After this ${interaction.direction} call with ${contact} ("${desc}"), what follow-up actions should I take in the next 24 hours?`,
      whatsapp: `For this WhatsApp message with ${contact} ("${desc}"), what's the best way to respond and move this deal forward?`,
      voice:    `After this voice interaction with ${contact}: "${desc}" — what are the key next steps?`,
      meeting:  `Based on this meeting note about ${contact}: "${desc}" — what strategic moves should I make?`,
    }
    onAIAction?.(prompts[interaction.type] || `Tell me about this activity with ${contact}: ${desc}`, ctx)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Activity Feed</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading…' : `${interactions.length} real-time interactions from Supabase`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={summarizeAll} disabled={isLoading}>
            <Sparkles className="size-3 text-primary" />
            AI Summary
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading activity feed…
          </div>
        ) : interactions.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw className="mx-auto size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No interactions yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Log calls, emails or WhatsApp messages to see them here.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-1">
              {interactions.map((interaction) => {
                const cfg = TYPE_CONFIG[interaction.type] || getFallbackConfig()
                const Icon = cfg.icon
                const title = buildTitle(interaction)
                const description = buildDescription(interaction)
                const contact = interaction.lead?.full_name || '—'
                const ago = timeAgo(interaction.created_at)
                return (
                  <div
                    key={interaction.id}
                    className="relative flex gap-4 pl-2 py-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group"
                    onClick={() => activityAI(interaction)}
                  >
                    {/* Icon dot */}
                    <div className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ${cfg.bg} mt-0.5`}>
                      <Icon className={`size-3.5 ${cfg.color}`} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{title}</span>
                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 h-4 border-0 ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                          {interaction.direction === 'inbound' && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-0 bg-muted text-muted-foreground">
                              inbound
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{ago}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-muted-foreground">👤 {contact}</span>
                        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <Sparkles className="size-2.5" /> AI advice
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
