'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, MicOff, Loader2, Sparkles, CheckCircle2, Activity,
  RotateCcw, User, Building2, IndianRupee, Phone, Target,
  Calendar, FileText, Languages, Save, ArrowRight, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Stage = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'complete' | 'unsupported'

interface ExtractedFields {
  name: string
  company: string
  phone: string
  value: string
  intent: string
  sentiment: string
  task: string
  date: string
}

// Speech Recognition types
interface ISpeechRecognition {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

const EMPTY_FIELDS: ExtractedFields = {
  name: '', company: '', phone: '', value: '', intent: '', sentiment: '', task: '', date: ''
}

// Highlight key entities in the transcript
function highlightTranscript(text: string) {
  if (!text) return text
  const patterns = [
    { pattern: /(\b[A-Z][a-z]+ [A-Z][a-z]+\b)/g, cls: 'text-primary font-semibold bg-primary/10 px-1 rounded' },
    { pattern: /(₹[\d,]+|[\d.]+ lakh|[\d.]+ crore|[\d,]+ INR|[\d.]+ lakhs?)/gi, cls: 'text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1 rounded' },
    { pattern: /\b(deal|contract|invoice|payment|sign|close|budget|proposal)\b/gi, cls: 'text-amber-600 dark:text-amber-400 font-medium' },
  ]
  let html = text
  patterns.forEach(({ pattern, cls }) => {
    html = html.replace(pattern, `<span class="${cls}">$1</span>`)
  })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export function VoiceRecorderWidget() {
  const [stage, setStage] = useState<Stage>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [fields, setFields] = useState<ExtractedFields>(EMPTY_FIELDS)
  const [logs, setLogs] = useState<string[]>(['System ready. Tap mic to record.'])
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const finalTextRef = useRef('')

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setStage('unsupported')
    }
  }, [])

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 5)])
  }, [])

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setStage('unsupported'); return }

    finalTextRef.current = ''
    setTranscript('')
    setInterimText('')
    setFields(EMPTY_FIELDS)
    setLogs(['🎙️ Microphone opened. Speak now...'])

    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTextRef.current += e.results[i][0].transcript + ' '
        } else {
          interim = e.results[i][0].transcript
        }
      }
      setTranscript(finalTextRef.current)
      setInterimText(interim)
      const wordCount = finalTextRef.current.trim().split(' ').length
      if (wordCount % 8 === 0 && wordCount > 0) {
        addLog(`📦 Audio packet ${Math.floor(wordCount / 8)}: received`)
      }
    }
    rec.onerror = () => {
      setStage('idle')
      toast.error('Microphone access denied. Please allow mic access in browser settings.')
    }
    rec.onend = () => {
      const text = finalTextRef.current.trim()
      if (text) {
        setTranscript(text)
        processTranscript(text)
      } else {
        setStage('idle')
        addLog('No speech detected. Try again.')
      }
    }
    rec.start()
    recognitionRef.current = rec
    setStage('recording')
    addLog('🔴 Recording started...')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setStage('transcribing')
    addLog('⏹️ Recording stopped. Processing audio...')
  }

  const processTranscript = async (text: string) => {
    setStage('extracting')
    addLog('🤖 Sending to Gemini AI for entity extraction...')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a CRM data extractor. Extract entities from this English sales note. Return ONLY valid JSON with exactly these keys:
{
  "name": "full lead name or empty string",
  "company": "company name or empty string",
  "phone": "phone number or empty string",
  "value": "deal value formatted like ₹40,000 or empty string",
  "intent": "Hot or Warm or Cold based on buying signals",
  "sentiment": "Positive or Neutral or Negative",
  "task": "next action item in imperative form or empty string",
  "date": "follow-up date or empty string"
}

Sales note: "${text}"`,
          }],
        }),
      })

      let raw = ''
      const reader = res.body?.getReader()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          raw += new TextDecoder().decode(value)
        }
      }

      addLog('🧠 AI response received. Parsing fields...')

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as Partial<ExtractedFields>

        // Animate fields populating one by one
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

        if (data.name || data.company) {
          setFields(prev => ({ ...prev, name: data.name || '', company: data.company || '' }))
          addLog(`👤 Extracted: ${data.name || 'Unknown'} @ ${data.company || '—'}`)
          await delay(350)
        }
        if (data.phone || data.value) {
          setFields(prev => ({ ...prev, phone: data.phone || '', value: data.value || '' }))
          addLog(`💰 Extracted: Value=${data.value || '—'}, Phone=${data.phone || '—'}`)
          await delay(350)
        }
        if (data.intent || data.sentiment) {
          setFields(prev => ({ ...prev, intent: data.intent || '', sentiment: data.sentiment || '' }))
          addLog(`📊 Analyzed: Intent=${data.intent}, Sentiment=${data.sentiment}`)
          await delay(350)
        }
        if (data.task || data.date) {
          setFields(prev => ({ ...prev, task: data.task || '', date: data.date || '' }))
          addLog(`✅ Action: "${data.task || '—'}" by ${data.date || 'TBD'}`)
          await delay(200)
        }
        addLog('🎉 Lead extracted! Ready to save to CRM.')
      } else {
        setFields(prev => ({ ...prev, task: 'Review transcript manually' }))
        addLog('⚠️ Could not parse structured data. Saving raw transcript.')
      }
    } catch {
      setFields(prev => ({ ...prev, task: 'Review transcript manually' }))
      addLog('❌ AI extraction failed. Saving raw transcript.')
    }

    setStage('complete')
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSaving(false); return }

    // Save interaction with all extracted data
    const { error } = await supabase.from('interactions').insert({
      user_id: user.id,
      type: 'voice',
      direction: 'outbound',
      content_raw: transcript,
      content_transcribed: transcript,
      ai_extracted_data: fields,
      ai_summary: fields.task || fields.name ? `${fields.name}${fields.company ? ' @ ' + fields.company : ''}: ${fields.task || 'Voice note'}` : null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
      setSaving(false)
      return
    }

    // If we have a lead name, optionally create a lead too
    if (fields.name) {
      await supabase.from('leads').insert({
        user_id: user.id,
        full_name: fields.name,
        company: fields.company || null,
        phone_number: fields.phone || null,
        estimated_budget: fields.value ? parseInt(fields.value.replace(/[₹,]/g, '')) || null : null,
        status: 'new',
        buying_intent: (fields.intent?.toLowerCase() === 'hot' ? 'high' : fields.intent?.toLowerCase() === 'warm' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        sentiment_score: fields.sentiment?.toLowerCase().includes('positive') ? 0.7 : fields.sentiment?.toLowerCase().includes('negative') ? -0.5 : 0,
        source: 'voice',
        ai_summary: fields.task || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      toast.success(`Lead "${fields.name}" created & interaction saved! 🎉`)
    } else {
      toast.success('Voice note saved to CRM! ✅')
    }

    setSaving(false)
    handleReset()
  }

  const handleReset = () => {
    setStage('idle')
    setTranscript('')
    setInterimText('')
    setFields(EMPTY_FIELDS)
    setLogs(['System ready. Tap mic to record.'])
    finalTextRef.current = ''
  }

  if (stage === 'unsupported') {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="py-8 text-center">
          <AlertCircle className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">Voice not supported in this browser</p>
          <p className="text-xs text-muted-foreground mt-1">Please use Google Chrome for voice recording</p>
        </CardContent>
      </Card>
    )
  }

  const isActive = stage === 'recording' || stage === 'transcribing'
  const isProcessing = stage === 'extracting' || stage === 'transcribing'

  const FIELD_CONFIG: { key: keyof ExtractedFields; label: string; icon: React.ReactNode; isBadge?: boolean }[] = [
    { key: 'name',      label: 'Lead Name',    icon: <User className="size-3.5 text-muted-foreground" /> },
    { key: 'company',   label: 'Company',      icon: <Building2 className="size-3.5 text-muted-foreground" /> },
    { key: 'value',     label: 'Deal Value',   icon: <IndianRupee className="size-3.5 text-muted-foreground" /> },
    { key: 'phone',     label: 'Phone',        icon: <Phone className="size-3.5 text-muted-foreground" /> },
    { key: 'intent',    label: 'Intent',       icon: <Target className="size-3.5 text-muted-foreground" />, isBadge: true },
    { key: 'sentiment', label: 'Sentiment',    icon: <Sparkles className="size-3.5 text-muted-foreground" />, isBadge: true },
  ]

  return (
    <Card className="glass-card border-border/50 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Mic className="size-4 text-primary" />
            Voice-to-CRM
            <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 font-bold">AI</Badge>
          </span>
          <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
            <Languages className="size-3" /> English Only
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Animated Orb Visualizer */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="relative size-24 flex items-center justify-center mb-2">
            {/* Spinning orbits */}
            <div className={`absolute inset-0 rounded-full border border-dashed border-primary/20 ${isActive ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            <div className={`absolute inset-2 rounded-full border border-dashed border-primary/10 ${isActive ? 'animate-[spin_15s_linear_infinite_reverse]' : ''}`} />
            {/* Glow */}
            <div className={`absolute inset-6 rounded-full blur-lg transition-all duration-700 ${
              isActive ? 'bg-primary/30 scale-125' :
              stage === 'extracting' ? 'bg-amber-500/20 scale-110 animate-pulse' :
              stage === 'complete' ? 'bg-emerald-500/20 scale-100' : 'bg-primary/5 scale-90'
            }`} />
            {/* Central button */}
            <button
              onClick={stage === 'idle' ? startRecording : stage === 'recording' ? stopRecording : stage === 'complete' ? handleReset : undefined}
              disabled={isProcessing}
              className={`relative size-16 rounded-full flex items-center justify-center transition-all duration-500 border-2 cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
                isActive ? 'bg-red-500 border-red-400/60 shadow-[0_0_25px_rgba(239,68,68,0.4)] scale-105' :
                stage === 'extracting' ? 'bg-amber-500 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse' :
                stage === 'complete' ? 'bg-emerald-500 border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.3)]' :
                'bg-card border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              {stage === 'recording' ? (
                <MicOff className="size-6 text-white" />
              ) : stage === 'transcribing' ? (
                <Activity className="size-6 text-white animate-pulse" />
              ) : stage === 'extracting' ? (
                <Loader2 className="size-6 text-white animate-spin" />
              ) : stage === 'complete' ? (
                <CheckCircle2 className="size-6 text-white" />
              ) : (
                <Mic className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </button>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-center text-muted-foreground">
            {stage === 'idle' && 'Tap orb to start recording'}
            {stage === 'recording' && '🔴 Recording — tap to stop'}
            {stage === 'transcribing' && 'Processing audio...'}
            {stage === 'extracting' && '🤖 AI parsing fields...'}
            {stage === 'complete' && '✅ Done — tap orb to reset'}
          </p>
        </div>

        {/* Transcript Box */}
        {(transcript || interimText || stage === 'idle') && (
          <div className="bg-muted/30 dark:bg-black/20 rounded-xl border border-border/40 p-3 min-h-[60px] relative">
            <div className="text-[9px] uppercase font-mono text-muted-foreground/50 tracking-widest mb-2 flex items-center justify-between">
              <span>Live Transcript</span>
              {isActive && <span className="flex items-center gap-1 text-primary text-[8px] font-bold"><span className="size-1.5 rounded-full bg-primary animate-ping" /> LIVE</span>}
            </div>
            <div className="text-xs leading-relaxed text-foreground/90">
              {transcript ? (
                <>
                  {highlightTranscript(transcript)}
                  {interimText && <span className="text-muted-foreground italic"> {interimText}</span>}
                  {isActive && <span className="inline-block w-1 h-3 ml-0.5 bg-primary animate-pulse align-middle" />}
                </>
              ) : stage !== 'idle' ? (
                <span className="text-muted-foreground/40 italic">Listening for speech...</span>
              ) : (
                <span className="text-muted-foreground/40 italic">Speak a sales note — lead name, deal value, next action...</span>
              )}
            </div>
          </div>
        )}

        {/* AI Extracted Fields Grid */}
        {(stage === 'extracting' || stage === 'complete') && (
          <div className="grid grid-cols-2 gap-2">
            {FIELD_CONFIG.map(({ key, label, icon, isBadge }) => {
              const value = fields[key]
              return (
                <div key={key} className={`p-2.5 rounded-xl border transition-all duration-500 ${
                  value ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-muted/10 border-border/30'
                }`}>
                  <div className={`flex items-center gap-1.5 mb-1 ${value ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {icon}
                    <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>
                  </div>
                  {value ? (
                    isBadge ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        value.toLowerCase().includes('hot') || value.toLowerCase().includes('positive')
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : value.toLowerCase().includes('warm')
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                      }`}>{value}</span>
                    ) : (
                      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
                    )
                  ) : (
                    <span className="text-[9px] text-muted-foreground/30 italic">
                      {stage === 'extracting' ? 'Parsing...' : 'Not detected'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Task Box */}
        {fields.task && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-2.5">
            <ArrowRight className="size-3.5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">{fields.task}</p>
              {fields.date && <p className="text-[10px] text-primary/70 mt-0.5">Due: {fields.date}</p>}
            </div>
            <Badge className="text-[9px] shrink-0 py-0 h-4">Task</Badge>
          </div>
        )}

        {/* Terminal Log */}
        <div className="bg-black/90 dark:bg-black/70 text-zinc-400 font-mono rounded-xl p-3 border border-zinc-800 text-[9px] max-h-[80px] overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-1.5 mb-1.5">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-500 uppercase tracking-widest text-[8px]">OrbitCRM Sync Log</span>
          </div>
          <div className="space-y-0.5 overflow-hidden">
            {logs.map((log, i) => (
              <p key={i} className="truncate text-zinc-300 leading-relaxed">
                <span className="text-zinc-600 font-bold">›</span> {log}
              </p>
            ))}
          </div>
        </div>

        {/* Save / Reset Actions */}
        {stage === 'complete' && (
          <div className="flex gap-2">
            <Button
              className="flex-1 h-9 text-xs gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {saving ? 'Saving...' : fields.name ? `Save "${fields.name}" to CRM` : 'Save to CRM'}
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3" onClick={handleReset}>
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        )}

        {stage === 'idle' && (
          <p className="text-[10px] text-center text-muted-foreground/60">
            <FileText className="size-3 inline mr-1" />
            Speak a sales note, meeting summary, or follow-up
          </p>
        )}
      </CardContent>
    </Card>
  )
}
