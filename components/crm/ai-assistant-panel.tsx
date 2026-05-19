'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, X, Send, Sparkles, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date }
interface AIAssistantPanelProps {
  context?: string
  pendingPrompt?: string
  onPromptConsumed?: () => void
  forceOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const QUICK_PROMPTS = [
  { label: '🔥 Hot leads', prompt: 'Who are my top 3 hottest leads right now and what should I do next?' },
  { label: '📊 Pipeline health', prompt: 'Analyze my pipeline health and tell me where to focus this week.' },
  { label: '✉️ Follow-up email', prompt: 'Draft a follow-up email for a lead who went cold after our last call.' },
  { label: '💰 Revenue forecast', prompt: 'Based on the current pipeline, what is my expected revenue for this month?' },
  { label: '🎯 Close deal tips', prompt: 'Give me 3 strategies to accelerate deal closure in negotiation stage.' },
  { label: '📞 Call script', prompt: 'Write a 60-second cold call script for a B2B SaaS product in India.' },
]

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0,1,2].map(i => (
        <span key={i} className="size-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay:`${i*0.15}s`, animationDuration:'0.8s' }} />
      ))}
    </span>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 mr-2 mt-0.5">
          <Bot className="size-3.5 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'
      }`}>
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p className="text-[10px] mt-1.5 opacity-60">
          {msg.timestamp.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
        </p>
      </div>
    </div>
  )
}

export function AIAssistantPanel({ context, pendingPrompt, onPromptConsumed, forceOpen, onOpenChange }: AIAssistantPanelProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{
    role:'assistant',
    content:"Hi! I'm your OrbitCRM AI powered by Gemini. Ask me anything about your leads, pipeline, or need help drafting emails. 🚀",
    timestamp: new Date()
  }])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const actualOpen = forceOpen !== undefined ? forceOpen : open
  const setActualOpen = (v: boolean) => { setOpen(v); onOpenChange?.(v) }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, 50)
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, streamingText, scrollToBottom])
  useEffect(() => { if (actualOpen) setTimeout(() => inputRef.current?.focus(), 300) }, [actualOpen])

  // Auto-send pending prompt when panel opens
  useEffect(() => {
    if (pendingPrompt && actualOpen) {
      const timer = setTimeout(() => {
        sendMessage(pendingPrompt)
        onPromptConsumed?.()
      }, 400)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, actualOpen])

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return
    const userMsg: Message = { role:'user', content:text.trim(), timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)
    setStreamingText('')
    scrollToBottom()
    try {
      const res = await fetch('/api/ai/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          // Strip initial greeting — only send from the first user message onward
          // This prevents Gemini rejecting history that starts with role='model'
          messages: newMessages
            .filter((_, idx) => {
              const firstUserIdx = newMessages.findIndex(m => m.role === 'user')
              return idx >= firstUserIdx
            })
            .map(m => ({ role: m.role, content: m.content })),
          context: context || 'User is viewing the OrbitCRM dashboard.'
        })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'AI request failed') }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream:true })
        setStreamingText(full)
        scrollToBottom()
      }
      setMessages(prev => [...prev, { role:'assistant', content:full, timestamp: new Date() }])
    } catch(err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => [...prev, { role:'assistant', content:`❌ ${msg}`, timestamp: new Date() }])
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      scrollToBottom()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  function clearChat() {
    setMessages([{ role:'assistant', content:'Chat cleared! How can I help you today? 🚀', timestamp: new Date() }])
    setStreamingText('')
  }

  return (
    <>
      <button id="ai-assistant-toggle" onClick={() => setActualOpen(!actualOpen)}
        className="fixed bottom-20 right-6 z-50 flex items-center gap-2 bg-gradient-to-br from-violet-600 to-indigo-600 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all duration-200 font-semibold text-sm"
        style={{ boxShadow:'0 8px 32px rgba(124,58,237,0.4)' }}>
        <Sparkles className="size-4" />
        AI Assistant
      </button>

      <div className={`fixed bottom-0 right-0 z-50 flex flex-col bg-background border-l border-t border-border shadow-2xl transition-all duration-300 ease-in-out ${
        actualOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
      }`} style={{ width:'380px', height:'100dvh', maxHeight:'100dvh' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-indigo-500/10 shrink-0">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
            <Sparkles className="size-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">OrbitCRM AI</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                Gemini
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Your sales intelligence co-pilot</p>
          </div>
          <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={clearChat} title="Clear chat">
            <RotateCcw className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setActualOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Quick Prompts */}
        <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(qp => (
              <button key={qp.label} onClick={() => sendMessage(qp.prompt)} disabled={isStreaming}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                {qp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {isStreaming && (
            <div className="flex justify-start mb-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 mr-2 mt-0.5">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm">
                {streamingText ? <p className="whitespace-pre-wrap break-words">{streamingText}</p> : <TypingDots />}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 pb-4 pt-2 border-t border-border shrink-0">
          <div className="flex items-end gap-2 bg-muted rounded-2xl px-3 py-2 border border-border focus-within:border-primary/60 transition-colors">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask about leads, deals, emails…" rows={1} disabled={isStreaming}
              className="flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground max-h-28 leading-relaxed" />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95">
              {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Shift+Enter for new line · Enter to send</p>
        </div>
      </div>

      {actualOpen && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setActualOpen(false)} />}
    </>
  )
}
