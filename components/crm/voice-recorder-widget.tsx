'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, MicOff, Loader2, Smile, CheckCircle2,
  RotateCcw, User, Building2, IndianRupee, Phone, Target,
  FileText, Languages, Save, ArrowRight, AlertCircle
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

interface ISpeechRecognition {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void
}

const EMPTY_FIELDS: ExtractedFields = {
  name: '', company: '', phone: '', value: '', intent: '', sentiment: '', task: '', date: ''
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
    if (typeof window !== 'undefined') {
      const w = window as any
      if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
        setStage('unsupported')
      }
    }
  }, [])

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 5)])
  }, [])

  const startRecording = () => {
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { setStage('unsupported'); return }

    finalTextRef.current = ''
    setTranscript('')
    setInterimText('')
    setFields(EMPTY_FIELDS)
    setLogs(['Microphone opened. Speak now...'])

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
    }
    rec.onerror = () => {
      setStage('idle')
      toast.error('Microphone access denied.')
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
    addLog('Recording started...')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setStage('transcribing')
    addLog('Recording stopped. Processing audio...')
  }

  const processTranscript = async (text: string) => {
    setStage('extracting')
    addLog('Sending to AI for entity extraction...')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Extract entities from this English/Indian sales note. Return ONLY valid JSON with exactly these keys:
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

      addLog('AI response received. Parsing fields...')

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as Partial<ExtractedFields>
        setFields({
          name: data.name || '',
          company: data.company || '',
          phone: data.phone || '',
          value: data.value || '',
          intent: data.intent || '',
          sentiment: data.sentiment || '',
          task: data.task || '',
          date: data.date || ''
        })
        addLog('Lead extracted! Ready to save to CRM.')
      } else {
        setFields(prev => ({ ...prev, task: 'Review transcript manually' }))
        addLog('Could not parse structured data.')
      }
    } catch {
      setFields(prev => ({ ...prev, task: 'Review transcript manually' }))
      addLog('AI extraction failed.')
    }

    setStage('complete')
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSaving(false); return }

    // Save interaction
    const { error } = await (supabase as any).from('interactions').insert({
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

    if (fields.name) {
      await (supabase as any).from('leads').insert({
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
      toast.success(`Lead "${fields.name}" created!`)
    } else {
      toast.success('Voice note saved!')
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
      <Card className="border border-border/80 bg-card rounded-lg shadow-sm">
        <CardContent className="py-8 text-center">
          <AlertCircle className="size-10 text-muted-foreground/35 mx-auto mb-3" />
          <p className="text-sm font-semibold">Voice not supported in this browser</p>
          <p className="text-xs text-muted-foreground mt-1">Please use a compatible browser.</p>
        </CardContent>
      </Card>
    )
  }

  const isActive = stage === 'recording' || stage === 'transcribing'
  const isProcessing = stage === 'extracting' || stage === 'transcribing'

  const FIELD_CONFIG: { key: keyof ExtractedFields; label: string; icon: React.ReactNode }[] = [
    { key: 'name',      label: 'Lead Name',    icon: <User className="size-3.5 text-muted-foreground" /> },
    { key: 'company',   label: 'Company',      icon: <Building2 className="size-3.5 text-muted-foreground" /> },
    { key: 'value',     label: 'Deal Value',   icon: <IndianRupee className="size-3.5 text-muted-foreground" /> },
    { key: 'phone',     label: 'Phone',        icon: <Phone className="size-3.5 text-muted-foreground" /> },
    { key: 'intent',    label: 'Intent',       icon: <Target className="size-3.5 text-muted-foreground" /> },
    { key: 'sentiment', label: 'Sentiment',    icon: <Smile className="size-3.5 text-muted-foreground" /> },
  ]

  return (
    <Card className="border border-border/80 bg-card rounded-lg shadow-sm">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold">
          <span className="flex items-center gap-2">
            <Mic className="size-4 text-foreground" />
            Voice Intelligence
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <Languages className="size-3" /> EN/IN Languages
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Simple Monochrome Trigger Control */}
        <div className="flex flex-col items-center justify-center py-2">
          <button
            onClick={stage === 'idle' ? startRecording : stage === 'recording' ? stopRecording : stage === 'complete' ? handleReset : undefined}
            disabled={isProcessing}
            className={`size-14 rounded-full flex items-center justify-center transition-all border cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive ? 'bg-foreground text-background border-foreground shadow-sm' :
              stage === 'complete' ? 'bg-foreground text-background border-foreground shadow-sm' :
              'bg-background text-foreground border-border hover:bg-muted/40'
            }`}
          >
            {stage === 'recording' ? (
              <MicOff className="size-5" />
            ) : isProcessing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : stage === 'complete' ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </button>
          <p className="text-[10px] font-bold uppercase tracking-wider text-center text-muted-foreground mt-3">
            {stage === 'idle' && 'Tap to start recording'}
            {stage === 'recording' && 'Recording — tap to stop'}
            {isProcessing && 'Processing audio...'}
            {stage === 'complete' && 'Processed — tap to reset'}
          </p>
        </div>

        {/* Transcript Box */}
        {(transcript || interimText || stage === 'idle') && (
          <div className="bg-muted/20 rounded-lg border border-border/60 p-3 min-h-[60px]">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Transcript</span>
            <div className="text-xs leading-relaxed text-foreground/90">
              {transcript ? (
                <>
                  {transcript}
                  {interimText && <span className="text-muted-foreground italic"> {interimText}</span>}
                </>
              ) : (
                <span className="text-muted-foreground/45 italic">Speak a sales update...</span>
              )}
            </div>
          </div>
        )}

        {/* Extracted Fields */}
        {(stage === 'extracting' || stage === 'complete') && (
          <div className="grid grid-cols-2 gap-2">
            {FIELD_CONFIG.map(({ key, label, icon }) => {
              const value = fields[key]
              return (
                <div key={key} className="p-2.5 rounded-lg border border-border/60 bg-muted/10">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    {icon}
                    <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>
                  </div>
                  {value ? (
                    <p className="text-xs font-semibold text-foreground truncate">{value}</p>
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

        {fields.task && (
          <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start gap-2">
            <ArrowRight className="size-3.5 text-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">{fields.task}</p>
              {fields.date && <p className="text-[10px] text-muted-foreground mt-0.5">Due: {fields.date}</p>}
            </div>
          </div>
        )}

        {/* Terminal logs */}
        <div className="bg-black text-zinc-400 font-mono rounded-lg p-3 border border-zinc-800 text-[9px] max-h-[80px] overflow-hidden">
          <div className="flex items-center gap-1 border-b border-zinc-900 pb-1.5 mb-1.5">
            <span className="text-zinc-600 uppercase tracking-widest text-[8px]">KlinqCRM System Console</span>
          </div>
          <div className="space-y-0.5">
            {logs.map((log, i) => (
              <p key={i} className="truncate text-zinc-300">
                › {log}
              </p>
            ))}
          </div>
        </div>

        {/* Save / Reset Actions */}
        {stage === 'complete' && (
          <div className="flex gap-2">
            <Button
              className="flex-1 h-9 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save to CRM'}
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg border-border" onClick={handleReset}>
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
