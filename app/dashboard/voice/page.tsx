'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, MicOff, Loader2, CheckCircle2, User,
  IndianRupee, ArrowRight, History, AlertTriangle,
  RefreshCw, Building2, Phone, Target, Smile, Bot, Languages
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type Stage = 'idle' | 'recording' | 'processing' | 'complete'

interface Extracted {
  leadName?: string
  company?: string
  sentiment?: string
  sentimentScore?: number
  nextAction?: string
  followUpDate?: string
  budget?: number
  phone?: string
  summary?: string
}

interface CRMRecognitionEvent { resultIndex: number; results: SpeechRecognitionResultList }
interface CRMRecognitionErrorEvent { error: string }
interface CRMRecognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  onresult: ((e: CRMRecognitionEvent) => void) | null
  onerror: ((e: CRMRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void
}
type CRMRecognitionCtor = new () => CRMRecognition
function getSR(): CRMRecognitionCtor | undefined {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition
}

const LANG_MAP: Record<string, string> = {
  hinglish: 'hi-IN', hindi: 'hi-IN', english: 'en-IN', tamil: 'ta-IN', marathi: 'mr-IN'
}

const FIELD_CONFIG = [
  { key: 'leadName', label: 'Lead Name', icon: User },
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'budget', label: 'Budget', icon: IndianRupee },
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'sentiment', label: 'Sentiment', icon: Smile },
  { key: 'nextAction', label: 'Next Action', icon: Target },
]

export default function VoiceToCRMPage() {
  const [stage, setStage] = useState<Stage>('idle')
  const [transcript, setTranscript] = useState('')
  const [liveText, setLiveText] = useState('')
  const [extracted, setExtracted] = useState<Extracted>({})
  const [language, setLanguage] = useState('english')
  const [saving, setSaving] = useState(false)
  const [browserOk, setBrowserOk] = useState(true)
  const [logs, setLogs] = useState<string[]>(['System ready. Select language and press the mic.'])
  const recogRef = useRef<CRMRecognition | null>(null)
  const { interactions, isLoading: intLoading, refetch } = useRealtimeInteractions()
  const { leads } = useRealtimeLeads()

  const voiceHistory = interactions
    .filter(i => i.type === 'voice' || i.type === 'call')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  useEffect(() => { if (!getSR()) setBrowserOk(false) }, [])

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev.slice(0, 5)])

  const extractWithAI = useCallback(async (text: string) => {
    addLog('Analyzing transcript with AI...')
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Extract structured data from this Indian sales note. Return ONLY valid JSON:
{"leadName":"person name","company":"company name","sentiment":"Positive|Neutral|Negative","sentimentScore":0.0-1.0,"nextAction":"next action","followUpDate":"YYYY-MM-DD","budget":number,"phone":"phone","summary":"summary"}
Note: "${text}"`
          }]
        })
      })
      let raw = ''
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')
      const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value)
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          const d = line.replace('data: ', '').trim()
          if (d === '[DONE]') continue
          try { raw += JSON.parse(d).text || '' } catch {}
        }
      }
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        setExtracted(parsed)
        addLog(`Parsed: ${parsed.leadName || 'Lead'} @ ${parsed.company || 'Unknown'}`)
      } else {
        setExtracted({ summary: raw || 'Complete', sentiment: 'Neutral', sentimentScore: 0.5 })
      }
      setStage('complete')
    } catch {
      setExtracted({ summary: text, sentiment: 'Neutral', sentimentScore: 0.5 })
      setStage('complete')
    }
  }, [])

  const handleStart = useCallback(() => {
    const SR = getSR()
    if (!SR) { toast.error('Browser unsupported'); return }
    const rec = new SR()
    rec.lang = LANG_MAP[language] || 'en-IN'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = (e: CRMRecognitionEvent) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t + ' '
        else interim += t
      }
      setLiveText(finalText + interim)
    }
    rec.onerror = () => { setStage('idle') }
    rec.onend = () => {
      setTranscript(finalText.trim())
      if (finalText.trim()) { setStage('processing'); extractWithAI(finalText.trim()) }
      else { setStage('idle') }
    }
    rec.start()
    recogRef.current = rec
    setLiveText('')
    setExtracted({})
    setStage('recording')
    setLogs(['Voice recording started...'])
  }, [extractWithAI, language])

  const handleStop = useCallback(() => { recogRef.current?.stop() }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSaving(false); return }

    const matchedLead = extracted.leadName
      ? leads.find(l => l.full_name.toLowerCase().includes((extracted.leadName || '').toLowerCase()))
      : null

    const { data: ins, error } = await supabase.from('interactions').insert({
      user_id: user.id,
      lead_id: matchedLead?.id || null,
      type: 'voice',
      direction: 'inbound',
      content_raw: transcript,
      content_transcribed: transcript,
      sentiment_score: extracted.sentimentScore || 0,
      created_at: new Date().toISOString(),
    }).select('id').single()

    if (!error && ins?.id && extracted.summary) {
      await supabase.from('interactions').update({ ai_summary: extracted.summary }).eq('id', ins.id).then(() => {})
    }

    if (error) {
      toast.error('Failed to save')
    } else {
      if (matchedLead) {
        await supabase.from('leads').update({
          last_contacted_at: new Date().toISOString(),
          sentiment_score: extracted.sentimentScore || matchedLead.sentiment_score,
          ai_summary: extracted.summary || matchedLead.ai_summary,
          estimated_budget: extracted.budget || matchedLead.estimated_budget,
          updated_at: new Date().toISOString(),
        }).eq('id', matchedLead.id)
      }
      toast.success('Saved successfully!')
      refetch()
      handleReset()
    }
    setSaving(false)
  }, [transcript, extracted, leads, refetch])

  const handleReset = () => {
    setStage('idle'); setTranscript(''); setLiveText(''); setExtracted({})
    setLogs(['System reset. Ready.'])
  }

  const getFieldValue = (key: string) => {
    if (key === 'budget') return extracted.budget ? `₹${(extracted.budget / 100000).toFixed(1)}L` : ''
    return (extracted as any)[key] || ''
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <CRMHeader title="Voice to CRM" subtitle="Speak updates naturally — parsed in real-time" />

      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
        {!browserOk && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20 text-xs">
            <AlertTriangle className="size-4 shrink-0" />
            Please use a browser that supports SpeechRecognition.
          </div>
        )}

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">Voice Playground</span>
            </div>
            <div className="flex items-center gap-3">
              <Select value={language} onValueChange={setLanguage} disabled={stage === 'recording'}>
                <SelectTrigger className="h-7 text-xs w-32 border-border/80 bg-background">
                  <Languages className="size-3.5 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hinglish">Hinglish</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="tamil">Tamil</SelectItem>
                  <SelectItem value="marathi">Marathi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Voice Console */}
            <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-border flex flex-col gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Voice Console</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Press mic, select language, speak update.</p>
              </div>

              {/* Mic Area */}
              <div className="flex flex-col items-center justify-center p-6 border border-border bg-muted/10 rounded-lg min-h-[160px]">
                <button
                  onClick={stage === 'recording' ? handleStop : stage === 'idle' || stage === 'complete' ? (stage === 'complete' ? handleReset : handleStart) : undefined}
                  disabled={stage === 'processing' || !browserOk}
                  className={`size-14 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                    stage === 'recording' ? 'bg-foreground text-background border-foreground shadow-sm' :
                    'bg-background text-foreground border-border hover:bg-muted/40'
                  }`}
                >
                  {stage === 'recording' ? <MicOff className="size-5" /> :
                   stage === 'processing' ? <Loader2 className="size-5 animate-spin" /> :
                   <Mic className="size-5" />}
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-3 text-muted-foreground">
                  {stage === 'idle' && 'Tap to record'}
                  {stage === 'recording' && 'Recording — tap to stop'}
                  {stage === 'processing' && 'Processing...'}
                  {stage === 'complete' && 'Done'}
                </span>
              </div>

              {/* Transcript */}
              <div className="flex-1 flex flex-col bg-muted/20 border border-border rounded-lg p-4 min-h-[100px]">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Live Text Output</span>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {liveText || transcript || <span className="text-muted-foreground/35 italic">Awaiting speech note...</span>}
                </p>
              </div>
            </div>

            {/* CRM Pipeline */}
            <div className="lg:col-span-7 p-6 flex flex-col gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Real-Time Extraction</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Fields fill automatically</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {FIELD_CONFIG.map(field => {
                  const val = getFieldValue(field.key)
                  return (
                    <div key={field.key} className="p-3 border border-border/80 bg-muted/10 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                        <field.icon className="size-3.5" />
                        <span className="text-[9px] font-mono uppercase tracking-wider">{field.label}</span>
                      </div>
                      {val ? (
                        <p className="text-xs font-bold text-foreground truncate">{val}</p>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/30 italic">Awaiting...</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {extracted.summary && (
                <div className="p-4 border border-border bg-muted/25 rounded-lg">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">AI Summary</span>
                  <p className="text-xs text-foreground/80 leading-relaxed">{extracted.summary}</p>
                </div>
              )}

              {stage === 'complete' && (
                <div className="flex gap-2">
                  <Button className="flex-1 h-9 text-xs font-semibold rounded bg-foreground text-background hover:bg-foreground/90 shadow-sm" disabled={saving} onClick={handleSave}>
                    {saving ? 'Saving...' : 'Save to CRM'}
                  </Button>
                  <Button variant="outline" className="h-9 text-xs rounded border-border" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              )}

              {/* Console Logs */}
              <div className="bg-black text-zinc-400 font-mono rounded-lg p-3 border border-zinc-800 text-[9px] max-h-[90px] overflow-hidden flex flex-col">
                <span className="text-zinc-600 uppercase tracking-widest text-[8px] border-b border-zinc-900 pb-1 mb-1.5">System Console</span>
                <div className="space-y-0.5">
                  {logs.map((log, i) => (
                    <p key={i} className="truncate">› {log}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Voice Inbox History</h3>
            <Button variant="ghost" size="icon" className="size-8 rounded" onClick={refetch}>
              <RefreshCw className="size-3.5" />
            </Button>
          </div>

          {intLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
          ) : voiceHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border border-border/80 rounded-lg bg-muted/10">
              No recent voice notes.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {voiceHistory.map(item => (
                <div key={item.id} className="p-4 rounded-lg border border-border/80 bg-card">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-bold text-foreground">
                      {leads.find(l => l.id === item.lead_id)?.full_name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {item.content_transcribed && (
                    <p className="text-xs text-muted-foreground line-clamp-2">"{item.content_transcribed}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
