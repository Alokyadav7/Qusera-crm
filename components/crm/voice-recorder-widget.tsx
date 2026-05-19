'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, Sparkles, Languages, CheckCircle2, User, Calendar, IndianRupee, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete' | 'unsupported'

interface ExtractedData {
  leadName?: string
  nextAction?: string
  followUpDate?: string
  budget?: number
  summary?: string
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

export function VoiceRecorderWidget() {
  const [state, setState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [interimText, setInterimText] = useState<string>('')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setState('unsupported')
    }
  }, [])

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setState('unsupported'); return }
    const rec = new SR()
    rec.lang = 'hi-IN'
    rec.continuous = true
    rec.interimResults = true
    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setTranscript(finalText)
      setInterimText(interim)
    }
    rec.onerror = () => { setState('idle'); toast.error('Microphone access denied') }
    rec.onend = () => { if (finalText.trim()) processTranscript(finalText) }
    rec.start()
    recognitionRef.current = rec
    setState('recording')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setState('processing')
  }

  const processTranscript = async (text: string) => {
    setState('processing')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Extract CRM data from this sales conversation note (may be in Hinglish/Hindi/English). Return ONLY valid JSON with keys: leadName, nextAction, followUpDate (ISO), budget (number in INR), summary. Text: "${text}"` }],
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
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0])
          setExtractedData(data)
        } else {
          setExtractedData({ summary: text.trim() })
        }
      } catch {
        setExtractedData({ summary: text.trim() })
      }
      setState('complete')
    } catch {
      setExtractedData({ summary: text.trim() })
      setState('complete')
    }
  }

  const handleSave = async () => {
    if (!extractedData) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSaving(false); return }
    const { error } = await supabase.from('interactions').insert({
      user_id: user.id,
      type: 'voice',
      direction: 'outbound',
      content_raw: transcript,
      content_transcribed: transcript,
      ai_extracted_data: extractedData,
      ai_summary: extractedData.summary || null,
      created_at: new Date().toISOString(),
    })
    if (error) toast.error('Failed to save: ' + error.message)
    else {
      toast.success('Saved to CRM! View in Interactions →')
      setState('idle')
      setTranscript('')
      setExtractedData(null)
    }
    setSaving(false)
  }

  const reset = () => { setState('idle'); setTranscript(''); setInterimText(''); setExtractedData(null) }

  if (state === 'unsupported') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Mic className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">Voice not supported</p>
          <p className="text-xs text-muted-foreground mt-1">Use Chrome for voice recording</p>
          <Button size="sm" className="mt-3" asChild>
            <Link href="/dashboard/voice">Open Voice Page</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="size-5 text-primary" />
          Voice to CRM
          <Badge variant="default" className="ml-1 text-xs">AI</Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Languages className="size-3" />Speak in English, Hindi, or Hinglish
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {state === 'idle' && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Button size="lg" className="size-16 rounded-full mb-3" onClick={startRecording}>
              <Mic className="size-7" />
            </Button>
            <p className="text-sm font-medium">Tap to record</p>
            <p className="text-xs text-muted-foreground mt-1">Log meetings, update leads, create tasks</p>
          </div>
        )}

        {state === 'recording' && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="relative mb-3">
              <Button size="lg" variant="destructive" className="size-16 rounded-full animate-pulse" onClick={stopRecording}>
                <MicOff className="size-7" />
              </Button>
              <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
            </div>
            <p className="text-sm font-medium text-red-600">Recording… tap to stop</p>
            {(transcript || interimText) && (
              <p className="text-xs text-muted-foreground mt-2 px-2 italic line-clamp-2">
                "{transcript}{interimText}"
              </p>
            )}
          </div>
        )}

        {state === 'processing' && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Loader2 className="size-7 text-primary animate-spin" />
            </div>
            <p className="text-sm font-medium">Processing with AI…</p>
            <p className="text-xs text-muted-foreground">Extracting CRM data</p>
          </div>
        )}

        {state === 'complete' && extractedData && (
          <div className="space-y-3">
            {transcript && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Transcript</p>
                <p className="text-xs italic line-clamp-2">"{transcript.trim()}"</p>
              </div>
            )}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="size-4 text-primary" />
                <span className="text-xs font-medium">AI Extracted</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {extractedData.leadName && (
                  <div className="bg-blue-50 rounded p-1.5 flex items-center gap-1">
                    <User className="size-3 text-blue-600" />
                    <span className="text-blue-700 font-medium truncate">{extractedData.leadName}</span>
                  </div>
                )}
                {extractedData.nextAction && (
                  <div className="bg-green-50 rounded p-1.5 flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-green-600" />
                    <span className="text-green-700 font-medium truncate">{extractedData.nextAction}</span>
                  </div>
                )}
                {extractedData.budget && (
                  <div className="bg-emerald-50 rounded p-1.5 flex items-center gap-1">
                    <IndianRupee className="size-3 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">₹{(extractedData.budget / 100000).toFixed(1)}L</span>
                  </div>
                )}
                {extractedData.followUpDate && (
                  <div className="bg-amber-50 rounded p-1.5 flex items-center gap-1">
                    <Calendar className="size-3 text-amber-600" />
                    <span className="text-amber-700 font-medium truncate">{extractedData.followUpDate}</span>
                  </div>
                )}
              </div>
              {extractedData.summary && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="size-3" /> Summary</p>
                  <p className="text-xs mt-0.5 line-clamp-2">{extractedData.summary}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-3 mr-1 animate-spin" /> : <CheckCircle2 className="size-3 mr-1" />}
                Save to CRM
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>Again</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
