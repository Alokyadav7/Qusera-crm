'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, MicOff, Loader2, Sparkles, Languages, Volume2,
  CheckCircle2, Calendar, User, IndianRupee, FileText,
  ArrowRight, History, AlertTriangle, RefreshCw
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRealtimeInteractions } from '@/hooks/use-realtime-interactions'
import { useRealtimeLeads } from '@/hooks/use-realtime-leads'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete'

interface ExtractedData {
  leadName?: string
  sentiment?: string
  sentimentScore?: number
  nextAction?: string
  followUpDate?: string
  budget?: number
  summary?: string
}

// ── Self-contained Speech Recognition types ───────────────────────────────────
interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}
interface ISpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

const LANG_MAP: Record<string, string> = {
  hinglish: 'hi-IN',
  hindi: 'hi-IN',
  english: 'en-IN',
  tamil: 'ta-IN',
  marathi: 'mr-IN',
}

export default function VoiceToCRMPage() {
  const [recState, setRecState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [liveText, setLiveText] = useState<string>('')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [language, setLanguage] = useState('hinglish')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [browserSupport, setBrowserSupport] = useState(true)

  const recogRef = useRef<ISpeechRecognition | null>(null)
  const { interactions, isLoading: intLoading, refetch } = useRealtimeInteractions()
  const { leads } = useRealtimeLeads()

  // Filter only voice interactions
  const voiceHistory = interactions
    .filter(i => i.type === 'voice' || i.type === 'call')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) setBrowserSupport(false)
  }, [])

  // ── Start real microphone recording ───────────────────────────────────
  const handleStart = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Your browser does not support voice recognition. Use Chrome.'); return }

    const recognition = new SR()
    recognition.lang = LANG_MAP[language] || 'hi-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    let finalTranscript = ''

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += t + ' '
        else interim += t
      }
      setLiveText(finalTranscript + interim)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      toast.error('Microphone error: ' + e.error)
      setRecState('idle')
    }

    recognition.onend = () => {
      setTranscript(finalTranscript.trim())
      if (finalTranscript.trim()) {
        setRecState('processing')
        extractWithGemini(finalTranscript.trim())
      } else {
        setRecState('idle')
        toast.error('No speech detected. Try again.')
      }
    }

    recognition.start()
    recogRef.current = recognition
    setLiveText('')
    setRecState('recording')
    toast.success('Listening… speak now')
  }, [language])

  const handleStop = useCallback(() => {
    recogRef.current?.stop()
  }, [])

  // ── Send transcript to Gemini for CRM data extraction ─────────────────
  const extractWithGemini = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a CRM assistant. Extract structured data from this voice note in JSON format.
Voice Note: "${text}"
Return ONLY a JSON object with these fields (omit if not found):
{
  "leadName": "person mentioned",
  "sentiment": "Positive|Neutral|Negative",
  "sentimentScore": 0.0-1.0,
  "nextAction": "what to do next",
  "followUpDate": "YYYY-MM-DD if mentioned",
  "budget": number in INR if mentioned,
  "summary": "2-3 sentence English summary"
}`,
          }],
        }),
      })

      let rawJson = ''
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.replace('data: ', '').trim()
          if (data === '[DONE]') continue
          try { rawJson += JSON.parse(data).text || '' } catch {}
        }
      }

      const jsonMatch = rawJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setExtractedData(parsed)
      } else {
        setExtractedData({ summary: rawJson || 'AI extraction complete', sentiment: 'Neutral', sentimentScore: 0.5 })
      }
      setRecState('complete')
    } catch (err) {
      console.error(err)
      // Fallback: use raw transcript as summary
      setExtractedData({ summary: text, sentiment: 'Neutral', sentimentScore: 0.5 })
      setRecState('complete')
    }
  }, [])

  // ── Save to Supabase interactions table ───────────────────────────────
  const handleSaveToCRM = useCallback(async () => {
    setSavingId('saving')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSavingId(null); return }

    // Try to match lead by name
    const matchedLead = extractedData?.leadName
      ? leads.find(l => l.full_name.toLowerCase().includes((extractedData.leadName || '').toLowerCase()))
      : null

    const { error } = await supabase.from('interactions').insert({
      user_id: user.id,
      lead_id: matchedLead?.id || null,
      type: 'voice',
      direction: 'inbound',
      content_raw: transcript,
      content_transcribed: transcript,
      sentiment_score: extractedData?.sentimentScore || 0,
      ai_summary: extractedData?.summary || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      // Update lead fields if matched
      if (matchedLead) {
        await supabase.from('leads').update({
          last_contacted_at: new Date().toISOString(),
          sentiment_score: extractedData?.sentimentScore || matchedLead.sentiment_score,
          ai_summary: extractedData?.summary || matchedLead.ai_summary,
          estimated_budget: extractedData?.budget || matchedLead.estimated_budget,
          updated_at: new Date().toISOString(),
        }).eq('id', matchedLead.id)
      }

      // Create a follow-up task if date extracted
      if (extractedData?.nextAction && matchedLead) {
        await supabase.from('tasks').insert({
          user_id: user.id,
          lead_id: matchedLead.id,
          title: extractedData.nextAction,
          due_date: extractedData.followUpDate || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
      }

      toast.success('Saved to CRM!' + (matchedLead ? ` Linked to ${matchedLead.full_name}` : ' (no lead matched)'))
      refetch()
      handleReset()
    }
    setSavingId(null)
  }, [transcript, extractedData, leads, refetch])

  const handleReset = () => {
    setRecState('idle')
    setTranscript('')
    setLiveText('')
    setExtractedData(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader
        title="Voice to CRM"
        subtitle="Record voice notes in Hindi, English or Hinglish — AI extracts & saves data"
      />

      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Main Recording Area */}
          <div className="xl:col-span-2 space-y-6">

            {/* Browser support warning */}
            {!browserSupport && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="flex items-center gap-3 pt-4">
                  <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">Voice recording requires <strong>Google Chrome</strong>. Please open this page in Chrome for full functionality.</p>
                </CardContent>
              </Card>
            )}

            {/* Language */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="size-5 text-primary" />
                    <span className="font-medium">Input Language</span>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50">
                      <span className="size-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />Live STT
                    </Badge>
                  </div>
                  <Select value={language} onValueChange={setLanguage} disabled={recState === 'recording'}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hinglish">Hinglish (Mixed)</SelectItem>
                      <SelectItem value="hindi">Hindi (हिंदी)</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="tamil">Tamil (தமிழ்)</SelectItem>
                      <SelectItem value="marathi">Marathi (मराठी)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Recording Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-4">
                <CardTitle className="flex items-center gap-2"><Mic className="size-5" />Voice Recorder</CardTitle>
                <CardDescription>Tap the mic and speak. AI will transcribe and extract CRM data in real-time.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 pb-8">

                {/* IDLE */}
                {recState === 'idle' && (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Button
                      size="lg"
                      className="size-32 rounded-full mb-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                      onClick={handleStart}
                      disabled={!browserSupport}
                    >
                      <Mic className="size-12" />
                    </Button>
                    <p className="text-lg font-medium mb-2">Tap to Start Recording</p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Say things like "Met with Rajesh today, budget is 5 lakhs, follow up on Friday"
                    </p>
                  </div>
                )}

                {/* RECORDING */}
                {recState === 'recording' && (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                      <Button size="lg" variant="destructive" className="size-32 rounded-full shadow-lg" onClick={handleStop}>
                        <MicOff className="size-12" />
                      </Button>
                      <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
                    </div>
                    <p className="text-lg font-medium text-red-600 mb-2">Recording… tap to stop</p>
                    {liveText && (
                      <div className="mt-4 max-w-lg text-left bg-muted/50 rounded-lg p-4 text-sm italic text-muted-foreground">
                        "{liveText}"
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1 mt-6 h-16">
                      {[16,40,28,56,20,48,32,60,24,44,36,52].map((h, i) => (
                        <div key={i} className="w-2 bg-red-500 rounded-full animate-pulse"
                          style={{ height: `${h}px`, animationDelay: `${i * 100}ms`, animationDuration: '0.5s' }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* PROCESSING */}
                {recState === 'processing' && (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <div className="size-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <Loader2 className="size-16 text-primary animate-spin" />
                    </div>
                    <p className="text-lg font-medium mb-2">Processing with Gemini AI…</p>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2 justify-center"><CheckCircle2 className="size-4 text-emerald-500" />Audio transcribed</span>
                      <span className="flex items-center gap-2 justify-center animate-pulse"><Loader2 className="size-4 animate-spin" />Extracting CRM data via Gemini…</span>
                    </div>
                  </div>
                )}

                {/* COMPLETE */}
                {recState === 'complete' && extractedData && (
                  <div className="space-y-6">
                    {/* Transcript */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Volume2 className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Transcript</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm italic">"{transcript}"</p>
                      </div>
                    </div>

                    {/* Extracted Data */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="size-4 text-primary" />
                        <span className="text-sm font-medium">AI Extracted Data</span>
                        <Badge variant="default" className="ml-auto">Ready to Save</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {extractedData.leadName && (
                          <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-3">
                            <User className="size-5 text-blue-600" />
                            <div><p className="text-xs text-muted-foreground">Lead</p><p className="font-medium text-blue-700">{extractedData.leadName}</p></div>
                          </div>
                        )}
                        {extractedData.sentiment && (
                          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-3">
                            <CheckCircle2 className="size-5 text-emerald-600" />
                            <div><p className="text-xs text-muted-foreground">Sentiment</p><p className="font-medium text-emerald-700">{extractedData.sentiment} ({extractedData.sentimentScore?.toFixed(2)})</p></div>
                          </div>
                        )}
                        {extractedData.nextAction && (
                          <div className="flex items-center gap-2 bg-amber-50 rounded-lg p-3">
                            <ArrowRight className="size-5 text-amber-600" />
                            <div><p className="text-xs text-muted-foreground">Next Action</p><p className="font-medium text-amber-700">{extractedData.nextAction}</p></div>
                          </div>
                        )}
                        {extractedData.followUpDate && (
                          <div className="flex items-center gap-2 bg-purple-50 rounded-lg p-3">
                            <Calendar className="size-5 text-purple-600" />
                            <div><p className="text-xs text-muted-foreground">Follow-up</p><p className="font-medium text-purple-700">{extractedData.followUpDate}</p></div>
                          </div>
                        )}
                        {extractedData.budget && (
                          <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3">
                            <IndianRupee className="size-5 text-green-600" />
                            <div><p className="text-xs text-muted-foreground">Budget</p><p className="font-medium text-green-700">₹{(extractedData.budget / 100000).toFixed(1)}L</p></div>
                          </div>
                        )}
                      </div>

                      {extractedData.summary && (
                        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="size-4 text-primary" />
                            <span className="text-sm font-medium">AI Summary</span>
                          </div>
                          <p className="text-sm">{extractedData.summary}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button className="flex-1" disabled={savingId === 'saving'} onClick={handleSaveToCRM}>
                        {savingId === 'saving' ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
                        {savingId === 'saving' ? 'Saving…' : 'Save to CRM'}
                      </Button>
                      <Button variant="outline" onClick={handleReset}>Record Another</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />Tips for Best Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Mention lead name', '"Spoke with Rajesh today"'],
                  ['State amounts in lakhs', '"Budget is 5 lakh" or "50 hazaar"'],
                  ['Use relative dates', '"Follow up kal" or "next Monday"'],
                  ['Describe outcome', '"He is interested" or "Deal done"'],
                ].map(([title, example], i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">{i + 1}</span>
                    </div>
                    <p><strong>{title}</strong> — <span className="text-muted-foreground italic">"{example}"</span></p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Voice Interactions from Supabase */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="size-5" />Recent Voice Notes
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="size-8" onClick={refetch}>
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {intLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : voiceHistory.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <Mic className="size-8 mx-auto mb-2 opacity-30" />
                    No voice notes yet — record one above!
                  </div>
                ) : voiceHistory.map(item => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {leads.find(l => l.id === item.lead_id)?.full_name || 'Unknown Lead'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {item.content_transcribed && (
                      <p className="text-xs text-muted-foreground italic mb-2 line-clamp-2">
                        "{item.content_transcribed}"
                      </p>
                    )}
                    {item.ai_summary && (
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{item.ai_summary.slice(0, 40)}…</Badge>
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
