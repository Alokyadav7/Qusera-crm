'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Phone,
  Send,
  Search,
  Paperclip,
  Mic,
  MoreVertical,
  CheckCheck,
  Bot,
  User,
  MessageSquare,
  FileText,
  MapPin,
  Image,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Interaction, InteractionLead } from '@/hooks/use-realtime-interactions'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Conversation {
  lead: InteractionLead
  lastInteraction: Interaction
  unreadCount: number
  allInteractions: Interaction[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSentimentLabel(score: number | null): string {
  if (score === null) return 'Unknown'
  if (score >= 0.6) return 'Very Positive'
  if (score >= 0.3) return 'Positive'
  if (score >= -0.3) return 'Neutral'
  if (score >= -0.6) return 'Negative'
  return 'Very Negative'
}

function getSentimentColor(score: number | null): string {
  if (score === null) return 'text-slate-600 bg-slate-50 border-slate-200'
  if (score >= 0.6) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 0.3) return 'text-green-600 bg-green-50 border-green-200'
  if (score >= -0.3) return 'text-slate-600 bg-slate-50 border-slate-200'
  if (score >= -0.6) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getMessageText(interaction: Interaction): string {
  return interaction.content_transcribed || interaction.content_raw || `[${interaction.type} message]`
}

const quickReplies = [
  'Thank you for your interest!',
  'Let me check and get back to you.',
  'I will send the details shortly.',
  'Can we schedule a call?',
  'Please find the document attached.',
  'What time works best for you?',
]

const templateMessages = [
  { id: 't1', name: 'Welcome Message', preview: 'Welcome! Thank you for your interest. How can I help you today?' },
  { id: 't2', name: 'Follow-up', preview: 'Hi, just following up on our conversation. Do you have any questions?' },
  { id: 't3', name: 'Meeting Confirmation', preview: 'Your meeting is confirmed. Looking forward to speaking with you!' },
  { id: 't4', name: 'Payment Reminder', preview: 'This is a gentle reminder about the pending payment. Please let us know if you have any questions.' },
  { id: 't5', name: 'Thank You', preview: 'Thank you for choosing us! We appreciate your trust and look forward to serving you.' },
]

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Fetch all whatsapp interactions joined with leads ──
  const fetchInteractions = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('interactions')
      .select('*, lead:leads(id, full_name, company, phone_number)')
      .in('type', ['whatsapp', 'text', 'voice', 'call', 'email'])
      .order('created_at', { ascending: false })
      .limit(500)
    if (!error && data) {
      setInteractions(data as Interaction[])
      // Auto-select first conversation
      const firstWithLead = (data as Interaction[]).find(i => i.lead_id)
      if (firstWithLead?.lead_id && !selectedLeadId) {
        setSelectedLeadId(firstWithLead.lead_id)
      }
    }
    setIsLoading(false)
  }, [selectedLeadId])

  useEffect(() => {
    fetchInteractions()
    const supabase = createClient()
    const channel = supabase
      .channel('whatsapp-interactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' }, fetchInteractions)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchInteractions])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [interactions, selectedLeadId])

  // ── Build conversations grouped by lead ──
  const conversations: Conversation[] = (() => {
    const byLead: Record<string, Interaction[]> = {}
    interactions.forEach(i => {
      if (!i.lead_id || !i.lead) return
      if (!byLead[i.lead_id]) byLead[i.lead_id] = []
      byLead[i.lead_id].push(i)
    })
    return Object.entries(byLead)
      .map(([leadId, items]) => {
        const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return {
          lead: sorted[0].lead!,
          lastInteraction: sorted[0],
          unreadCount: sorted.filter(i => i.direction === 'inbound').length,
          allInteractions: [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        }
      })
      .sort((a, b) => new Date(b.lastInteraction.created_at).getTime() - new Date(a.lastInteraction.created_at).getTime())
  })()

  const filteredConversations = conversations.filter(c =>
    c.lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lead.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lead.phone_number || '').includes(searchQuery)
  )

  const selectedConversation = conversations.find(c => c.lead.id === selectedLeadId) || null
  const selectedMessages = selectedConversation?.allInteractions || []

  // ── Send a new interaction ──
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedLeadId || isSending) return
    setIsSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsSending(false); return }

    await supabase.from('interactions').insert({
      user_id: user.id,
      lead_id: selectedLeadId,
      type: 'whatsapp',
      direction: 'outbound',
      content_raw: messageInput.trim(),
      created_at: new Date().toISOString(),
    })
    setMessageInput('')
    setIsSending(false)
    fetchInteractions()
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">WhatsApp Business</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              {isLoading ? 'Loading…' : `${conversations.length} conversations · real-time from Supabase`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-8" onClick={fetchInteractions}>
              <RefreshCw className="size-3.5" />
            </Button>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              <span className="hidden sm:inline">Connected</span>
              <span className="sm:hidden">Live</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Conversations List ── */}
        <div className={cn(
          'w-full md:w-80 lg:w-96 border-r flex flex-col bg-background',
          showMobileChat && 'hidden md:flex'
        )}>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" /> Loading…
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-16 text-center px-4">
                <MessageSquare className="mx-auto size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No WhatsApp conversations yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Interactions logged as 'whatsapp' type will appear here.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map(conv => {
                  const avgSentiment = conv.allInteractions.reduce((s, i) => s + (i.sentiment_score || 0), 0) / conv.allInteractions.length || null
                  return (
                    <button
                      key={conv.lead.id}
                      onClick={() => { setSelectedLeadId(conv.lead.id); setShowMobileChat(true) }}
                      className={cn(
                        'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                        selectedLeadId === conv.lead.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="size-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(conv.lead.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{conv.lead.full_name}</span>
                            <span className="text-xs text-muted-foreground">{timeAgo(conv.lastInteraction.created_at)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{conv.lead.company || conv.lead.phone_number || '—'}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-muted-foreground truncate pr-2">
                              {conv.lastInteraction.direction === 'outbound' ? '✓ ' : ''}{getMessageText(conv.lastInteraction).slice(0, 40)}
                            </span>
                            {conv.allInteractions.filter(i => i.direction === 'inbound').length > 0 && (
                              <Badge className="size-5 p-0 flex items-center justify-center text-xs shrink-0">
                                {conv.allInteractions.filter(i => i.direction === 'inbound').length}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1">
                            <Badge variant="outline" className={cn('text-xs', getSentimentColor(avgSentiment))}>
                              {getSentimentLabel(avgSentiment)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Chat Area ── */}
        {selectedConversation ? (
          <div className={cn('flex-1 flex flex-col', !showMobileChat && 'hidden md:flex')}>
            {/* Chat Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between bg-background">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ArrowLeft className="size-5" />
                </Button>
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedConversation.lead.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedConversation.lead.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedConversation.lead.phone_number || selectedConversation.lead.company || '—'}
                    {' · '}{selectedMessages.length} messages
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon">
                  <Phone className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Lead Profile</DropdownMenuItem>
                    <DropdownMenuItem>Add to Task</DropdownMenuItem>
                    <DropdownMenuItem>Export Chat</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Block Contact</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-[#f0f2f5] dark:bg-muted/30">
              <div className="space-y-4 max-w-3xl mx-auto">
                {selectedMessages.map(message => {
                  const text = getMessageText(message)
                  const isOut = message.direction === 'outbound'
                  const aiExtracted = message.ai_extracted_data as Record<string, unknown> | null
                  const aiSuggestion = typeof aiExtracted?.suggestion === 'string' ? aiExtracted.suggestion : null

                  return (
                    <div key={message.id} className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[75%] rounded-lg px-4 py-2 shadow-sm',
                        isOut ? 'bg-emerald-100 dark:bg-emerald-900/40 text-foreground' : 'bg-white dark:bg-card text-foreground'
                      )}>
                        {message.type === 'voice' && (
                          <div className="flex items-center gap-2 p-1 mb-1">
                            <Mic className="size-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Voice message</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
                          {isOut && <CheckCheck className="size-4 text-muted-foreground" />}
                        </div>
                        {aiSuggestion && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs flex items-start gap-2">
                            <Bot className="size-4 text-blue-600 shrink-0 mt-0.5" />
                            <span className="text-blue-700 dark:text-blue-300">{aiSuggestion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Replies */}
            <div className="border-t px-4 py-2 bg-background">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {quickReplies.map((reply, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap text-xs"
                      onClick={() => setMessageInput(reply)}
                    >
                      {reply}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Message Input */}
            <div className="border-t p-4 bg-background">
              <div className="flex items-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Paperclip className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem><Image className="mr-2 size-4" />Photo &amp; Video</DropdownMenuItem>
                    <DropdownMenuItem><FileText className="mr-2 size-4" />Document</DropdownMenuItem>
                    <DropdownMenuItem><MapPin className="mr-2 size-4" />Location</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex-1">
                  <Textarea
                    placeholder="Type a message…"
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    className="min-h-[44px] max-h-32 resize-none"
                    rows={1}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
                    }}
                  />
                </div>
                {messageInput ? (
                  <Button size="icon" onClick={handleSendMessage} disabled={isSending}>
                    {isSending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost">
                    <Mic className="size-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-muted/30">
            <div className="text-center">
              <MessageSquare className="mx-auto size-16 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Select a conversation</h3>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading conversations…' : conversations.length === 0 ? 'No WhatsApp conversations found in database.' : 'Choose a contact to start messaging'}
              </p>
            </div>
          </div>
        )}

        {/* ── Right Panel — Templates & Lead Info ── */}
        <div className="hidden xl:block w-80 border-l bg-background">
          <Tabs defaultValue="templates" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b px-4 h-12">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="info">Lead Info</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="flex-1 p-4 space-y-4 mt-0">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Message Templates</h4>
                <p className="text-xs text-muted-foreground">Click to use a pre-approved template</p>
              </div>
              <div className="space-y-2">
                {templateMessages.map(template => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setMessageInput(template.preview)}
                  >
                    <CardContent className="p-3">
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.preview}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="info" className="flex-1 p-4 mt-0">
              {selectedConversation ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <Avatar className="size-20 mx-auto">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {getInitials(selectedConversation.lead.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="mt-3 font-semibold">{selectedConversation.lead.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedConversation.lead.company || '—'}</p>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="text-sm font-medium">{selectedConversation.lead.phone_number || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total Interactions</div>
                      <div className="text-sm font-medium">{selectedMessages.length} messages</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg Sentiment</div>
                      {(() => {
                        const avg = selectedMessages.reduce((s, i) => s + (i.sentiment_score || 0), 0) / selectedMessages.length || null
                        return (
                          <Badge variant="outline" className={cn('mt-1', getSentimentColor(avg))}>
                            {getSentimentLabel(avg)}
                          </Badge>
                        )
                      })()}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Last Message</div>
                      <div className="text-sm font-medium">{timeAgo(selectedConversation.lastInteraction.created_at)}</div>
                    </div>
                  </div>
                  <Separator />
                  <Button className="w-full" variant="outline">
                    <User className="mr-2 size-4" />
                    View Full Profile
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Select a conversation
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
