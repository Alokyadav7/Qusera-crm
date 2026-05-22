"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  Mic,
  TrendingUp,
  MapPin,
  Shield,
  BarChart3,
  Users,
  Phone,
  Mail,
  CheckCircle2,
  Star,
  ArrowRight,
  Menu,
  X,
  Zap,
  Globe,
  Clock,
  HeadphonesIcon,
  ChevronRight,
  Play,
  Keyboard,
  Timer,
  Target,
  Brain,
  Languages,
  FileText,
  Sparkles,
  Building2,
  Briefcase,
  ShoppingBag,
  Factory,
  ChevronDown,
  Check,
  Minus,
  CircleCheck,
  CircleX,
  LucideIcon,
  Loader2,
  Volume2,
  Activity,
  Sun,
  Moon,
  Coins
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'


// Navigation Component
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            <Zap className="size-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text text-transparent">OrbitCRM</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Testimonials
          </Link>
          <Link href="#integrations" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Integrations
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg border border-border/50 hover:bg-muted/50"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
            <Link href="/login">Start Free Trial</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg border border-border/50 hover:bg-muted/50"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-background">
          <nav className="container mx-auto flex flex-col gap-4 p-4">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </Link>
            <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Testimonials
            </Link>
            <Link href="#integrations" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Integrations
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="w-full">
                <Link href="/login">Start Free Trial</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

// Demo scenarios for the real-time interactive playground
const DEMO_SCENARIOS = [
  {
    title: "Reliance Retail Deal",
    icon: "🛍️",
    leadName: "Sanjay Gupta",
    company: "Reliance Retail",
    value: "₹40,000",
    intent: "Hot",
    sentiment: "Very Positive",
    task: "Schedule Demo Call with VP",
    date: "Thursday, 3:00 PM",
    phone: "+91 98765 43210",
    script: "Hey, I just completed a great meeting with Sanjay Gupta from Reliance Retail. He's looking to buy 15 licenses of our Pro plan for his enterprise sales team. Total budget is forty thousand INR. He wants a demo call this Thursday at 3 PM to show his VP. Intent is very hot, get it into the pipeline."
  },
  {
    title: "Tata Motors Fleet",
    icon: "🚗",
    leadName: "Kavita Sharma",
    company: "Tata Motors",
    value: "₹1,20,000",
    intent: "Medium",
    sentiment: "Positive",
    task: "Email SOC 2 Audit Report",
    date: "Tomorrow Morning",
    phone: "+91 91234 56789",
    script: "Spoke with Kavita from Tata Motors logistics division. They want a custom integrations setup. Deal value is around one point two lakhs. They are interested but need verification of our SOC 2 compliance. Assigned a task to email them our audit trail report tomorrow morning."
  },
  {
    title: "HDFC Life Account",
    icon: "🏦",
    leadName: "Rajesh Mehta",
    company: "HDFC Life",
    value: "₹75,000",
    intent: "Hot",
    sentiment: "Extremely Positive",
    task: "Send Invoice to Finance Email",
    date: "Monday, 10:00 AM",
    phone: "+91 99887 76655",
    script: "Just got off a WhatsApp call with Rajesh Mehta from HDFC Life. They are ready to sign the contract for standard plan. Deal value is seventy five thousand INR. They need the invoice sent to their finance email by Monday. He's very happy with our demo."
  }
]

function VoiceCRMPlayground() {
  const [selectedDemoIndex, setSelectedDemoIndex] = useState(0)
  const [stage, setStage] = useState<'idle' | 'recording' | 'transcribing' | 'extracting' | 'completed'>('idle')
  const [transcript, setTranscript] = useState('')
  const [extractedFields, setExtractedFields] = useState({
    name: '', company: '', value: '', intent: '', sentiment: '', task: '', phone: ''
  })
  const [logs, setLogs] = useState<string[]>([
    "System initialized. Ready for real-time voice input."
  ])

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 4)])
  }

  const highlightTranscript = (text: string) => {
    if (!text) return text
    const highlights = [
      { term: "Sanjay Gupta", class: "text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20" },
      { term: "Reliance Retail", class: "text-blue-500 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20" },
      { term: "forty thousand INR", class: "text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" },
      { term: "Kavita Sharma", class: "text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20" },
      { term: "Tata Motors", class: "text-blue-500 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20" },
      { term: "one point two lakhs", class: "text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" },
      { term: "Rajesh Mehta", class: "text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20" },
      { term: "HDFC Life", class: "text-blue-500 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20" },
      { term: "seventy five thousand INR", class: "text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" }
    ]
    let highlighted = text
    highlights.forEach(h => {
      const regex = new RegExp(`(${h.term})`, 'gi')
      highlighted = highlighted.replace(regex, `<span class="${h.class}">$1</span>`)
    })
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />
  }

  const startSimulation = () => {
    if (stage !== 'idle' && stage !== 'completed') return

    setStage('recording')
    setTranscript('')
    setExtractedFields({ name: '', company: '', value: '', intent: '', sentiment: '', task: '', phone: '' })
    setLogs(["Simulating voice input feed...", "Connection established with transcription pipeline."])

    // Step 1: Recording simulation (1.2s)
    setTimeout(() => {
      setStage('transcribing')
      addLog("Streaming real-time audio packages...")
      const targetScenario = DEMO_SCENARIOS[selectedDemoIndex]
      const words = targetScenario.script.split(' ')
      let currentWordIndex = 0
      let textAccumulator = ''

      const typingTimer = setInterval(() => {
        if (currentWordIndex < words.length) {
          textAccumulator += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex]
          setTranscript(textAccumulator)
          currentWordIndex++
          if (currentWordIndex % 5 === 0) {
            addLog(`Received audio packet ${Math.floor(currentWordIndex / 5)}: OK`)
          }
        } else {
          clearInterval(typingTimer)
          setStage('extracting')
          addLog("Audio feed closed. Handing off to AI LLM parser...")

          setTimeout(() => {
            setExtractedFields(prev => ({
              ...prev,
              name: targetScenario.leadName,
              company: targetScenario.company
            }))
            addLog(`Extracted entities: Name='${targetScenario.leadName}', Company='${targetScenario.company}'`)

            setTimeout(() => {
              setExtractedFields(prev => ({
                ...prev,
                value: targetScenario.value,
                phone: targetScenario.phone || ''
              }))
              addLog(`Extracted values: DealValue='${targetScenario.value}', Phone='${targetScenario.phone || ""}'`)

              setTimeout(() => {
                setExtractedFields(prev => ({
                  ...prev,
                  intent: targetScenario.intent,
                  sentiment: targetScenario.sentiment
                }))
                addLog(`Analyzed sentiment: Level='${targetScenario.intent}', Sentiment='${targetScenario.sentiment}'`)

                setTimeout(() => {
                  setExtractedFields(prev => ({
                    ...prev,
                    task: targetScenario.task
                  }))
                  addLog(`Automated next action: '${targetScenario.task}' created`)

                  setTimeout(() => {
                    setStage('completed')
                    addLog(`Success: Lead for '${targetScenario.leadName}' created in CRM!`)
                  }, 200)
                }, 400)
              }, 400)
            }, 400)
          }, 800)
        }
      }, 60)
    }, 1200)
  }

  const resetPlayground = () => {
    setStage('idle')
    setTranscript('')
    setExtractedFields({ name: '', company: '', value: '', intent: '', sentiment: '', task: '', phone: '' })
    setLogs(["System reset. Ready for real-time voice input."])
  }

  const activeScenario = DEMO_SCENARIOS[selectedDemoIndex]

  return (
    <div className="relative rounded-3xl glass-card border border-border/40 overflow-hidden p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left shadow-[0_30px_70px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.5)]">
      {/* Visual Window Header decoration */}
      <div className="absolute top-0 left-0 right-0 h-10 border-b border-border/40 px-4 py-2 bg-muted/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-red-500/80" />
          <div className="size-3 rounded-full bg-yellow-500/80" />
          <div className="size-3 rounded-full bg-green-500/80" />
        </div>
        <div className="rounded-md bg-background/60 px-3 py-0.5 text-[9px] text-muted-foreground font-mono border border-border/30">
          playground.orbitcrm.in/realtime-voice
        </div>
        <div className="w-12" />
      </div>

      {/* Left Column: Voice Console */}
      <div className="lg:col-span-5 flex flex-col gap-6 pt-6">
        <div>
          <h3 className="text-xs font-bold tracking-widest text-primary uppercase mb-1">1. Choose a Scenario</h3>
          <p className="text-xs text-muted-foreground">Select a pre-recorded sales conversation scenario</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {DEMO_SCENARIOS.map((sc, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (stage === 'idle' || stage === 'completed') {
                  setSelectedDemoIndex(idx)
                  resetPlayground()
                }
              }}
              disabled={stage !== 'idle' && stage !== 'completed'}
              className={`group flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${selectedDemoIndex === idx
                ? "bg-primary/5 dark:bg-primary/10 border-primary shadow-[0_4px_20px_rgba(var(--primary),0.05)]"
                : "bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-border/80"
                } ${stage !== 'idle' && stage !== 'completed' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-2xl mt-0.5 filter drop-shadow-sm group-hover:scale-110 transition-transform">{sc.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{sc.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{sc.script}</p>
              </div>
            </button>
          ))}
        </div>

        {/* AI Pulsing Smart Speaker Visualizer */}
        <div className="flex flex-col items-center justify-center p-4 border border-border/40 bg-muted/10 rounded-2xl">
          <div className="relative size-32 my-2 flex items-center justify-center">
            {/* Orbits */}
            <div className={`absolute inset-0 rounded-full border border-dashed border-primary/20 transition-transform duration-1000 ${stage === 'recording' || stage === 'transcribing' ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            <div className={`absolute inset-2 rounded-full border border-dashed border-accent/20 transition-transform duration-1000 ${stage === 'recording' || stage === 'transcribing' ? 'animate-[spin_15s_linear_infinite_reverse]' : ''}`} />
            <div className={`absolute inset-4 rounded-full border border-primary/10 transition-transform duration-1000 ${stage === 'recording' || stage === 'transcribing' ? 'animate-[spin_20s_linear_infinite]' : ''}`} />

            {/* Outer Pulsing Glow */}
            <div className={`absolute inset-8 rounded-full blur-xl transition-all duration-700 ${stage === 'recording' || stage === 'transcribing' ? 'bg-primary/20 scale-120' : stage === 'extracting' ? 'bg-accent/25 scale-105' : stage === 'completed' ? 'bg-emerald-500/15 scale-100' : 'bg-primary/5 scale-90'
              }`} />

            {/* Central Sphere */}
            <div className={`relative size-20 rounded-full flex items-center justify-center transition-all duration-500 border ${stage === 'recording' || stage === 'transcribing'
              ? 'bg-primary border-primary/40 shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105'
              : stage === 'extracting'
                ? 'bg-accent border-accent/40 shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-pulse'
                : stage === 'completed'
                  ? 'bg-emerald-500 border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                  : 'bg-muted border-border/60 hover:border-primary/40 hover:bg-muted/80'
              }`}>
              <button
                onClick={stage === 'completed' ? resetPlayground : startSimulation}
                disabled={stage === 'transcribing' || stage === 'extracting'}
                className="size-full rounded-full flex items-center justify-center text-foreground transition-transform active:scale-95 cursor-pointer"
              >
                {stage === 'recording' || stage === 'transcribing' ? (
                  <Activity className="size-8 text-primary-foreground animate-pulse" />
                ) : stage === 'extracting' ? (
                  <Loader2 className="size-8 text-accent-foreground animate-spin" />
                ) : stage === 'completed' ? (
                  <Check className="size-8 text-white stroke-[3px]" />
                ) : (
                  <Mic className="size-8 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
            </div>
          </div>

          <div className="text-center mt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground block">
              {stage === 'idle' && "Click center sphere to start"}
              {stage === 'recording' && "Simulating Speech Input..."}
              {stage === 'transcribing' && "Listening & Transcribing..."}
              {stage === 'extracting' && "AI Parsing Parameters..."}
              {stage === 'completed' && "Sync Completed!"}
            </span>
          </div>
        </div>

        {/* Transcription Output Box */}
        <div className="flex-1 flex flex-col min-h-[120px] bg-muted/30 dark:bg-black/25 rounded-2xl border border-border/40 p-4 relative">
          <div className="text-[10px] uppercase font-mono text-muted-foreground/60 tracking-widest mb-3.5 flex items-center justify-between">
            <span>Speech-To-Text Console</span>
            {stage === 'transcribing' && (
              <span className="flex items-center gap-1.5 text-primary text-[9px] font-bold">
                <span className="size-1.5 rounded-full bg-primary animate-ping" /> STREAMING
              </span>
            )}
          </div>
          <div className="text-xs leading-relaxed font-medium text-foreground/95 select-none transition-all duration-300">
            {transcript ? (
              <>
                {highlightTranscript(transcript)}
                {stage === 'transcribing' && <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse" />}
              </>
            ) : (
              <span className="text-muted-foreground/45 italic">
                {stage === 'recording' ? "Opening audio socket stream..." : "Awaiting microphone input. Choose a scenario and hit the center smart speaker button above to start the real-time simulation."}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: CRM Lead Profile Sheet */}
      <div className="lg:col-span-7 flex flex-col gap-6 pt-6 border-t lg:border-t-0 lg:border-l border-border/40 lg:pl-8">
        <div>
          <h3 className="text-xs font-bold tracking-widest text-primary uppercase mb-1">2. CRM Real-Time Pipeline</h3>
          <p className="text-xs text-muted-foreground">Watch CRM fields populate dynamically as speech details are parsed</p>
        </div>

        {/* Lead Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Lead Name", value: extractedFields.name, icon: <Users className="size-4 text-muted-foreground" /> },
            { label: "Company", value: extractedFields.company, icon: <Building2 className="size-4 text-muted-foreground" /> },
            { label: "Value Estimate", value: extractedFields.value, icon: <BarChart3 className="size-4 text-muted-foreground" /> },
            { label: "Phone Number", value: extractedFields.phone, icon: <Phone className="size-4 text-muted-foreground" /> },
            { label: "Intent Tier", value: extractedFields.intent, icon: <Target className="size-4 text-muted-foreground" />, isBadge: true },
            { label: "Customer Sentiment", value: extractedFields.sentiment, icon: <Sparkles className="size-4 text-muted-foreground" />, isBadge: true }
          ].map((field, fIdx) => (
            <div
              key={fIdx}
              className={`p-4 rounded-2xl border transition-all duration-500 flex items-center justify-between ${field.value
                ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 scale-102 shadow-[0_10px_20px_rgba(16,185,129,0.04)]"
                : "bg-muted/10 border-border/30"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl transition-all duration-300 ${field.value ? 'bg-emerald-500/15 text-emerald-500 scale-110' : 'bg-muted'}`}>
                  {field.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{field.label}</p>
                  {field.value ? (
                    field.isBadge ? (
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${field.value.includes('Hot') || field.value.includes('Positive')
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}>
                        {field.value}
                      </span>
                    ) : (
                      <p className="font-bold text-sm text-foreground truncate mt-1 animate-fade-in">{field.value}</p>
                    )
                  ) : (
                    <span className="text-[10px] text-muted-foreground/35 italic block mt-1">Awaiting live parsing...</span>
                  )}
                </div>
              </div>
              {field.value && <CheckCircle2 className="size-4 text-emerald-500 shrink-0 animate-[scale-in_0.3s_ease_both]" />}
            </div>
          ))}
        </div>

        {/* AI Action Items Box */}
        <div className={`p-5 rounded-2xl border transition-all duration-500 ${extractedFields.task
          ? "bg-primary/5 dark:bg-primary/10 border-primary/30 shadow-[0_10px_25px_rgba(var(--primary),0.05)] scale-102"
          : "bg-muted/10 border-border/30 border-dashed"
          }`}>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Activity className="size-3.5" /> Live AI Action Planner
          </div>
          {extractedFields.task ? (
            <div className="flex items-start gap-3.5 animate-fade-in">
              <input type="checkbox" defaultChecked className="mt-1 rounded border-primary text-primary focus:ring-primary size-4" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground leading-tight">{extractedFields.task}</p>
                <p className="text-[10px] text-primary/80 font-medium mt-1">Due: {activeScenario.date}</p>
              </div>
              <Badge className="text-[9px] bg-primary text-primary-foreground font-mono py-0.5 px-2">NEW TASK</Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40 italic">Waiting for follow-up triggers in conversation...</span>
          )}
        </div>

        {/* Live Logs Terminal console */}
        <div className="bg-black/90 dark:bg-black/70 text-zinc-400 font-mono rounded-2xl p-4 border border-zinc-800 text-[10px] flex-1 flex flex-col min-h-[90px] max-h-[110px] overflow-hidden select-none shadow-inner">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-2 shrink-0 text-zinc-500 uppercase tracking-widest text-[9px]">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>OrbitCRM Sync Console Logs</span>
          </div>
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
            {logs.map((log, lIdx) => (
              <p key={lIdx} className="leading-relaxed truncate text-zinc-300">
                <span className="text-zinc-600 font-bold">&gt;</span> {log}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Hero Section with Stateful Interactive Playground and Live Laptop Mockup
function HeroSection() {
  const [stats, setStats] = useState({
    totalLeads: 1480,
    winRate: 94.2,
    revenue: 1840000
  })

  useEffect(() => {
    async function fetchCRMStats() {
      try {
        const supabase = createClient()
        const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true })
        const { data: won } = await supabase.from('leads').select('deal_value').eq('status', 'closed_won')
        const { count: totalWon } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'closed_won')

        if (total && total > 0) {
          const winRateVal = totalWon ? Math.round((totalWon / total) * 1000) / 10 : 94.2
          const revVal = won ? won.reduce((sum, deal) => sum + (Number(deal.deal_value) || 0), 0) : 1840000
          setStats({
            totalLeads: total,
            winRate: winRateVal > 0 ? winRateVal : 94.2,
            revenue: revVal > 0 ? revVal : 1840000
          })
        }
      } catch (err) {
        // Safe fallback
      }
    }
    fetchCRMStats()
  }, [])

  return (
    <section className="relative overflow-hidden pt-10 pb-16 md:pt-14 md:pb-24 lg:pt-16 lg:pb-28 bg-gradient-to-b from-background via-background to-muted/10">
      {/* Premium background radial highlights and grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10" />
      <div className="absolute top-[-20%] left-[-10%] size-[600px] rounded-full bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[-10%] size-[600px] rounded-full bg-gradient-to-br from-emerald-600/10 via-teal-600/5 to-transparent blur-[140px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center mb-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-balance leading-tight animate-fade-in-up delay-100">
            Stop Typing.
            <br />
            <span className="gradient-text animate-gradient bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-500">Start Talking.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm md:text-base text-muted-foreground text-pretty leading-relaxed animate-fade-in-up delay-200">
            India&apos;s first voice-native CRM. Capture leads, index conversations, and update your pipeline hands-free — fully optimized for Hindi, English, and Hinglish.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up delay-300">
            <Button size="lg" asChild className="w-full sm:w-auto h-11 px-6 text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
              <Link href="/login">
                Start Free Trial
                <ArrowRight className="ml-2 size-3.5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-11 px-6 text-xs glass hover:bg-muted/50">
              <Link href="#features">
                <Play className="mr-2 size-3.5 fill-foreground/10" />
                Try Interactive Demo
              </Link>
            </Button>
          </div>

          <div className="mt-6 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase flex items-center justify-center gap-2 animate-fade-in-up delay-400">
            <span>TRACK LEADS</span>
            <span className="text-primary/40">•</span>
            <span>SCALE FOR YOUR BUSINESS</span>
            <span className="text-primary/40">•</span>
            <span>24/7 CUSTOMER SUPPORT</span>
          </div>
        </div>

        {/* MacBook Laptop Mockup Display Container */}
        <div className="relative mx-auto mt-8 max-w-[800px] animate-fade-in-up delay-500">
          {/* Laptop Spotlight glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-accent/5 to-transparent blur-3xl opacity-50 -z-10 rounded-full" />

          {/* Left Floating Overlay Card */}
          <div className="absolute -left-12 top-1/4 z-30 hidden md:block w-48 p-4 rounded-2xl glass-card border border-border/40 shadow-xl hover:-translate-y-1 hover:shadow-primary/10 transition-all duration-300 animate-float">
            <div className="flex gap-1 mb-1.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-[10px] font-bold text-foreground">Over {stats.totalLeads}+ sales leads</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">dynamically indexed by AI voice</p>

            <div className="mt-2.5 pt-2.5 border-t border-border/40 flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live Syncing</span>
            </div>
          </div>

          {/* Right Floating Overlay Card */}
          <div className="absolute -right-12 bottom-1/4 z-30 hidden md:block w-48 p-5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl hover:-translate-y-1 hover:shadow-violet-500/20 transition-all duration-300 animate-float delay-200">
            <span className="text-[9px] uppercase tracking-wider font-mono opacity-85 block">Sales Win Rate</span>
            <span className="text-2xl font-extrabold tracking-tight mt-0.5 block">{stats.winRate}%</span>
            <p className="text-[9px] opacity-80 mt-0.5">Average closed-won deal score</p>
            <div className="mt-3 flex items-center gap-1 text-[9px] font-bold bg-white/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="size-3.5" />
              <span>₹{(stats.revenue / 100000).toFixed(1)}L Won</span>
            </div>
          </div>

          {/* Laptop Screen Body Bezel */}
          <div className="relative border-[8px] border-slate-950 rounded-t-xl bg-slate-900 shadow-2xl overflow-hidden aspect-[16/10] w-full border-b-0 shadow-violet-500/10">
            {/* Screen Reflective Sheen effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 z-10 pointer-events-none" />

            {/* Mock Dashboard App inside Screen */}
            <div className="size-full bg-background flex flex-col text-left select-none text-[11px] font-medium">
              {/* Top Mock Window Bar */}
              <div className="h-7 border-b border-border/30 px-3 bg-muted/40 flex items-center justify-between shrink-0">
                <div className="flex gap-1">
                  <div className="size-1.5 rounded-full bg-red-400/80" />
                  <div className="size-1.5 rounded-full bg-yellow-400/80" />
                  <div className="size-1.5 rounded-full bg-green-400/80" />
                </div>
                <div className="rounded bg-background/50 border border-border/20 px-4 py-0.5 text-[8px] font-mono text-muted-foreground w-1/3 text-center">
                  dashboard.orbitcrm.in/overview
                </div>
                <div className="size-3.5 rounded-full bg-muted flex items-center justify-center text-[7px]">👤</div>
              </div>

              {/* Mock Dashboard Layout */}
              <div className="flex-1 flex min-h-0">
                {/* Sidebar */}
                <div className="w-14 border-r border-border/30 bg-muted/20 p-2 flex flex-col gap-1.5 shrink-0">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`h-3.5 rounded ${i === 0 ? 'bg-primary/20 w-full' : 'bg-muted/40 w-3/4'}`} />
                  ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-2 overflow-hidden flex flex-col gap-2">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="p-1.5 border border-border/30 bg-card rounded-lg flex flex-col gap-0.5">
                      <span className="text-[7px] text-muted-foreground">TOTAL LEADS</span>
                      <span className="text-xs font-bold text-foreground font-mono">{stats.totalLeads}</span>
                    </div>
                    <div className="p-1.5 border border-border/30 bg-card rounded-lg flex flex-col gap-0.5">
                      <span className="text-[7px] text-muted-foreground">WIN RATE</span>
                      <span className="text-xs font-bold text-foreground font-mono">{stats.winRate}%</span>
                    </div>
                    <div className="p-1.5 border border-border/30 bg-card rounded-lg flex flex-col gap-0.5">
                      <span className="text-[7px] text-muted-foreground">REVENUE</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{(stats.revenue / 100000).toFixed(1)}L</span>
                    </div>
                  </div>

                  {/* Main Chart Area */}
                  <div className="flex-1 border border-border/30 bg-card rounded-lg p-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                      <span>MONTHLY SALES FORECAST</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                        <TrendingUp className="size-2.5" /> +12%
                      </span>
                    </div>
                    {/* Simulated Wave Chart SVG */}
                    <svg className="w-full h-12 text-primary mt-1" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <path
                        d="M0 25 Q15 15, 30 20 T60 8 T90 12 T100 5 L100 30 L0 30 Z"
                        fill="currentColor"
                        fillOpacity="0.08"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Laptop Base Stand keyboard chassis */}
          <div className="relative mx-auto w-[106%] -left-[3%] h-[10px] bg-slate-800 rounded-b-xl border-t border-slate-700/80 shadow-md flex justify-center">
            {/* Display Center open notch */}
            <div className="w-14 h-1 bg-slate-900 rounded-b-sm border-t border-slate-950" />
          </div>
          {/* Laptop Base Shadow */}
          <div className="mx-auto w-[98%] h-[6px] bg-black/10 dark:bg-black/50 blur-md rounded-full mt-0.5" />
        </div>

        {/* Dynamic Interactive Dashboard Preview Playground */}
        <div className="mx-auto mt-12 max-w-5xl animate-fade-in-up delay-600">
          <VoiceCRMPlayground />
        </div>

        {/* Trusted By Logos */}
        <div className="mx-auto mt-16 max-w-4xl animate-fade-in-up delay-700">
          <p className="text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">Trusted by 10,000+ sales teams</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {['TechCorp', 'GrowthBox', 'FinanceHub', 'RetailMax', 'ServicePro'].map((company) => (
              <div key={company} className="text-lg font-bold tracking-tighter text-foreground">{company}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Sales Team ROI Calculator Component
function SalesCalculator() {
  const [callsPerDay, setCallsPerDay] = useState(20)
  const [teamSize, setTeamSize] = useState(10)

  // Math calculations: 9 mins (0.15h) saved per call compared to manual data entry
  const hoursSavedPerMonth = Math.round(teamSize * (callsPerDay * 0.15) * 22)
  const extraCallsPerMonth = Math.round(hoursSavedPerMonth * 4)
  const estRevenueGain = Math.round(extraCallsPerMonth * 0.015 * 40000)

  return (
    <Card className="glass-card border border-border/40 bg-card/60 p-6 md:p-8 rounded-3xl mt-20 shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <Badge className="bg-primary/10 text-primary border-primary/20 mb-3 px-3 py-1 font-mono uppercase tracking-wider text-[10px]">Interactive ROI Calculator</Badge>
        <h3 className="text-2xl font-bold tracking-tight">Calculate Your Sales Team's Savings</h3>
        <p className="text-xs text-muted-foreground mt-2">See how much time and money your sales reps save by speaking instead of typing updates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Sliders Control Panel */}
        <div className="lg:col-span-6 space-y-6">
          {/* Slider 1: Calls per Rep */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                Daily Calls / Rep
              </label>
              <span className="text-lg font-extrabold text-primary font-mono">{callsPerDay} calls</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={callsPerDay}
              onChange={(e) => setCallsPerDay(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>5 calls</span>
              <span>30 calls</span>
              <span>60 calls</span>
            </div>
          </div>

          {/* Slider 2: Team Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="size-4 text-accent animate-pulse" />
                Sales Team Size
              </label>
              <span className="text-lg font-extrabold text-accent font-mono">{teamSize} reps</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={teamSize}
              onChange={(e) => setTeamSize(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>1 rep</span>
              <span>50 reps</span>
              <span>100 reps</span>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Result 1 */}
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 text-center flex flex-col justify-center items-center h-full hover:scale-102 transition-transform shadow-[0_4px_20px_rgba(var(--primary),0.02)]">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Clock className="size-5 text-primary" />
            </div>
            <div className="text-2xl font-extrabold text-primary font-mono">{hoursSavedPerMonth} hrs</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 leading-tight">Time Saved / Mo</div>
          </div>

          {/* Result 2 */}
          <div className="p-5 rounded-2xl bg-accent/5 border border-accent/20 text-center flex flex-col justify-center items-center h-full hover:scale-102 transition-transform shadow-[0_4px_20px_rgba(var(--accent),0.02)]">
            <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <TrendingUp className="size-5 text-accent" />
            </div>
            <div className="text-2xl font-extrabold text-accent font-mono">+{extraCallsPerMonth}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 leading-tight">Extra Sales Calls</div>
          </div>

          {/* Result 3 */}
          <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center flex flex-col justify-center items-center h-full hover:scale-102 transition-transform shadow-[0_10px_30px_rgba(16,185,129,0.05)] sm:col-span-1">
            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <Coins className="size-5 text-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-emerald-500 font-mono">₹{estRevenueGain.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1.5 leading-tight">Est. Revenue Gain</div>
          </div>
        </div>
      </div>
    </Card>
  )
}


// Features Section with Tabs
function FeaturesSection() {
  const featureCategories = [
    {
      id: 'voice',
      title: 'Voice Intelligence',
      icon: Mic,
      features: [
        {
          title: 'Multi-Language Transcription',
          description: 'Record in Hindi, English, Tamil, or mix languages. Our AI understands Hinglish naturally.',
          icon: Languages
        },
        {
          title: 'Smart Data Extraction',
          description: 'AI automatically extracts names, phone numbers, budgets, and follow-up dates from conversations.',
          icon: Brain
        },
        {
          title: 'Sentiment Analysis',
          description: 'Know instantly if a lead is hot, warm, or cold based on conversation tone and keywords.',
          icon: TrendingUp
        },
        {
          title: 'Action Item Detection',
          description: 'AI identifies commitments and creates tasks automatically. Never miss a follow-up again.',
          icon: Target
        }
      ]
    },
    {
      id: 'communication',
      title: 'Unified Communication',
      icon: MessageSquare,
      features: [
        {
          title: 'WhatsApp Business Integration',
          description: 'Manage all WhatsApp conversations in one inbox. Auto-capture leads from messages.',
          icon: Phone
        },
        {
          title: 'Smart Templates',
          description: 'AI-suggested responses based on conversation context. Send personalized messages in one click.',
          icon: Sparkles
        },
        {
          title: 'Broadcast Campaigns',
          description: 'Send targeted campaigns to lead segments. Track delivery, read receipts, and responses.',
          icon: Users
        },
        {
          title: 'Call Recording & Logging',
          description: 'Automatic call recording with transcription. Every customer touchpoint is documented.',
          icon: Mic
        }
      ]
    },
    {
      id: 'automation',
      title: 'Smart Automation',
      icon: Zap,
      features: [
        {
          title: 'Lead Scoring',
          description: 'AI-powered lead scoring based on behavior, engagement, and conversation sentiment.',
          icon: BarChart3
        },
        {
          title: 'Workflow Automation',
          description: 'Create automated sequences for lead nurturing. Trigger actions based on lead behavior.',
          icon: Target
        },
        {
          title: 'Route Optimization',
          description: 'AI plans the most efficient visit routes. Save fuel and time on field visits.',
          icon: MapPin
        },
        {
          title: 'Smart Reminders',
          description: 'Never miss a follow-up. AI reminds you at the optimal time based on lead timezone.',
          icon: Clock
        }
      ]
    },
    {
      id: 'compliance',
      title: 'Compliance & Security',
      icon: Shield,
      features: [
        {
          title: 'GST Verification',
          description: 'Instant GST number validation. Auto-fetch company details from GSTIN.',
          icon: CheckCircle2
        },
        {
          title: 'PAN & Aadhaar Verification',
          description: 'Built-in identity verification for KYC compliance. Secure and instant.',
          icon: FileText
        },
        {
          title: 'Bank Account Verification',
          description: 'Verify bank details before processing payments. Reduce fraud risk.',
          icon: Building2
        },
        {
          title: 'Audit Trail',
          description: 'Complete history of all changes. Stay compliant with industry regulations.',
          icon: Shield
        }
      ]
    }
  ]

  return (
    <section id="features" className="py-20 md:py-32 relative">
      <div className="absolute left-0 top-1/2 size-96 bg-secondary/10 blur-[100px] -z-10 rounded-full" />
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-16 animate-fade-in-up">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/20 bg-primary/5 text-primary">Features</Badge>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-balance">
            Everything You Need to
            <span className="gradient-text"> Close More Deals</span>
          </h2>
          <p className="mt-6 text-xl text-muted-foreground text-pretty">
            Purpose-built features for Indian sales teams that actually move the needle
          </p>
        </div>

        <div className="mx-auto max-w-6xl animate-fade-in-up delay-200">
          <Tabs defaultValue="voice" className="w-full">
            <TabsList className="flex w-full h-auto flex-wrap justify-center gap-3 bg-transparent p-0 mb-12">
              {featureCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 px-6 py-3 rounded-xl border border-border/50 glass hover:bg-muted/50 transition-all font-semibold text-base"
                >
                  <category.icon className="size-5 mr-2" />
                  {category.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {featureCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <div className="grid gap-8 md:grid-cols-2">
                  {category.features.map((feature, i) => (
                    <Card key={feature.title} className="glass-card card-hover animate-fade-in-up group overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-[0_15px_30px_rgba(124,58,237,0.04)] rounded-3xl transition-all duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                      <CardHeader className="p-6 md:p-8">
                        <div className="flex items-start gap-5">
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                            <feature.icon className="size-6" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold tracking-tight">{feature.title}</CardTitle>
                            <CardDescription className="mt-3 text-base leading-relaxed">
                              {feature.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  )
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Connect Your Channels',
      description: 'Link WhatsApp, phone, and email in minutes. No technical setup required.',
      icon: Phone
    },
    {
      step: '02',
      title: 'Talk to Your Leads',
      description: 'Have natural conversations. Our AI listens and captures everything important.',
      icon: Mic
    },
    {
      step: '03',
      title: 'AI Does the Work',
      description: 'Data is extracted, leads are scored, and follow-ups are scheduled automatically.',
      icon: Brain
    },
    {
      step: '04',
      title: 'Close More Deals',
      description: 'Focus on selling while OrbitCRM handles the busywork. Watch your pipeline grow.',
      icon: TrendingUp
    }
  ]

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-muted/10 border-t border-b border-border/20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/20">How It Works</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Get Started in
            <span className="text-primary"> 4 Simple Steps</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty">
            From signup to closing deals in under 10 minutes
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <Card key={item.step} className="relative overflow-hidden border border-border/40 bg-card/40 hover:border-primary/20 hover:shadow-[0_15px_30px_rgba(124,58,237,0.04)] transition-all duration-300 glass-card p-6 rounded-3xl flex flex-col justify-between min-h-[220px]">
                <div className="absolute top-0 right-0 p-4 select-none pointer-events-none">
                  <span className="text-4xl font-extrabold text-muted-foreground/15 font-mono">{item.step}</span>
                </div>
                <div>
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <item.icon className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '999',
      period: '/user/month',
      description: 'Perfect for small teams getting started with voice CRM',
      features: [
        { text: 'Up to 5 users', included: true },
        { text: '1,000 leads/month', included: true },
        { text: 'WhatsApp integration', included: true },
        { text: 'Basic voice recording', included: true },
        { text: 'Email support', included: true },
        { text: '5GB storage', included: true },
        { text: 'AI sentiment analysis', included: false },
        { text: 'Route optimization', included: false }
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      price: '2,499',
      period: '/user/month',
      description: 'Best for growing sales teams that need advanced features',
      features: [
        { text: 'Up to 25 users', included: true },
        { text: 'Unlimited leads', included: true },
        { text: 'Full WhatsApp Business API', included: true },
        { text: 'Voice-to-CRM (10+ languages)', included: true },
        { text: 'AI sentiment analysis', included: true },
        { text: 'Route optimization', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Priority support', included: true }
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with custom requirements',
      features: [
        { text: 'Unlimited users', included: true },
        { text: 'Unlimited everything', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'On-premise deployment', included: true },
        { text: 'SLA guarantee', included: true },
        { text: '24/7 phone support', included: true },
        { text: 'Custom AI training', included: true }
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ]

  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Simple, Transparent
            <span className="text-primary"> Pricing</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            No hidden fees. No surprises. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-500 glass-card border border-border/40 hover:-translate-y-1 ${plan.popular
                  ? 'border-primary/80 shadow-[0_20px_50px_rgba(124,58,237,0.15)] lg:scale-105 z-10'
                  : 'hover:border-border/80 hover:shadow-xl'
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 px-4 py-1 shadow-lg shadow-violet-500/20 font-semibold tracking-wider text-[10px]">MOST POPULAR</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8 pb-6 border-b border-border/10 bg-muted/10">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">{plan.name}</CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  {plan.price !== 'Custom' && <span className="text-2xl font-semibold text-foreground/80">₹</span>}
                  <span className="text-5xl font-extrabold tracking-tight text-foreground font-mono">{plan.price}</span>
                  <span className="text-muted-foreground text-xs font-medium ml-1">{plan.period}</span>
                </div>
                <CardDescription className="mt-3 text-xs leading-relaxed max-w-[200px] mx-auto">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-6 md:p-8">
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="size-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Minus className="size-4.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-xs ${feature.included ? 'text-foreground/90 font-medium' : 'text-muted-foreground/50'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-6 md:p-8 pt-0 border-t border-border/10">
                <Button
                  className={`w-full h-11 text-xs rounded-xl font-semibold transition-all ${plan.popular
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02]'
                      : 'glass hover:bg-muted/50 border-border/50 text-foreground'
                    }`}
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                  asChild
                >
                  <Link href="/login">{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All prices are in INR and exclude applicable taxes. Annual billing available with 20% discount.
        </p>
      </div>
    </section>
  )
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "OrbitCRM transformed our sales process completely. The voice-to-CRM feature saves us 2+ hours every day. My field team just records their notes in Hindi and everything is automatically organized with sentiment tags.",
      author: "Vikram Mehta",
      role: "Sales Director",
      company: "TechVentures India",
      avatar: "VM",
      metric: "40% increase in lead conversion"
    },
    {
      quote: "The WhatsApp integration is a game-changer for our business. We manage 500+ customer conversations daily and the AI sentiment alerts help us prioritize the right leads. Response time dropped from 4 hours to 15 minutes.",
      author: "Priya Nair",
      role: "Head of Sales",
      company: "GrowthBox Solutions",
      avatar: "PN",
      metric: "3x faster response time"
    },
    {
      quote: "Route optimization alone has reduced our fuel costs by 30%. The compliance verification feature keeps us audit-ready at all times. This is the only CRM that truly understands Indian business needs.",
      author: "Amit Patel",
      role: "Operations Manager",
      company: "DistributeNow",
      avatar: "AP",
      metric: "30% reduction in operational costs"
    },
    {
      quote: "Finally a CRM that understands Indian businesses! The Hindi voice support is perfect for our regional sales teams in Tier 2 and Tier 3 cities. Adoption was instant because there is no learning curve.",
      author: "Sneha Reddy",
      role: "CEO",
      company: "Bharat Commerce",
      avatar: "SR",
      metric: "95% team adoption in first week"
    }
  ]

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <Badge variant="outline" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Loved by
            <span className="text-primary"> 10,000+ Sales Teams</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            See what sales leaders across India are saying about OrbitCRM
          </p>
        </div>

        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="relative overflow-hidden glass-card border border-border/40 hover:border-border/80 hover:shadow-xl transition-all duration-300 rounded-3xl p-6">
              <CardContent className="p-0 flex flex-col justify-between h-full">
                <div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-sm font-medium leading-relaxed text-foreground/90 italic">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                </div>
                <div>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 w-fit">
                    <TrendingUp className="size-3.5" />
                    <span>{testimonial.metric}</span>
                  </div>
                  <div className="mt-6 flex items-center gap-4 border-t border-border/10 pt-4">
                    <Avatar className="size-11 border border-border/50 shadow-sm">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-semibold text-sm text-foreground">{testimonial.author}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {testimonial.role}, {testimonial.company}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// Industries Section
function IndustriesSection() {
  const industries = [
    { name: 'Real Estate', icon: Building2, description: 'Property listings, site visits, buyer tracking' },
    { name: 'Financial Services', icon: Briefcase, description: 'Lead nurturing, compliance, policy management' },
    { name: 'Retail & D2C', icon: ShoppingBag, description: 'Customer orders, inventory, delivery tracking' },
    { name: 'Manufacturing', icon: Factory, description: 'Distributor management, B2B sales, orders' }
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <Badge variant="outline" className="mb-4">Industries</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Built for
            <span className="text-primary"> Every Industry</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Customizable workflows for your specific business needs
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry) => (
            <Card key={industry.name} className="text-center hover:shadow-lg transition-shadow group">
              <CardContent className="pt-6">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary transition-colors">
                  <industry.icon className="size-8 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="mt-4 font-semibold">{industry.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{industry.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// Integrations Section
function IntegrationsSection() {
  const integrations = [
    { name: 'WhatsApp Business', category: 'Communication', icon: '💬' },
    { name: 'Google Workspace', category: 'Productivity', icon: '📁' },
    { name: 'Microsoft Teams', category: 'Productivity', icon: '👥' },
    { name: 'Tally ERP', category: 'Accounting', icon: '📊' },
    { name: 'Razorpay', category: 'Payments', icon: '💳' },
    { name: 'Zoho Books', category: 'Accounting', icon: '📒' },
    { name: 'Freshdesk', category: 'Support', icon: '🎧' },
    { name: 'Slack', category: 'Communication', icon: '🤝' },
    { name: 'Shopify', category: 'E-commerce', icon: '🛍️' },
    { name: 'Zapier', category: 'Automation', icon: '⚙️' },
    { name: 'Twilio', category: 'Communication', icon: '📞' },
    { name: 'AWS Cloud', category: 'Infrastructure', icon: '☁️' }
  ]

  // Duplicate for seamless infinite loop
  const duplicatedIntegrations = [...integrations, ...integrations]

  return (
    <section id="integrations" className="py-20 md:py-28 relative overflow-hidden bg-muted/20 border-t border-b border-border/40">
      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/20">Integrations</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Connects With Your
            <span className="gradient-text"> Favorite Tools</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground text-pretty">
            Seamlessly sync customer calls, texts, and bills with 50+ business apps you already run.
          </p>
        </div>

        {/* Marquee Container */}
        <div className="relative w-full overflow-hidden py-4 select-none">
          {/* Left fading mask */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          {/* Right fading mask */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused] transition-all">
            {duplicatedIntegrations.map((item, idx) => (
              <Card key={idx} className="glass-card flex items-center gap-3.5 px-6 py-4 w-[220px] shrink-0 border border-border/30 hover:border-primary/30 hover:scale-102 transition-all duration-300">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-xl shadow-inner">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-extrabold text-foreground truncate">{item.name}</span>
                  <span className="block text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">{item.category}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Need a custom integration for your workflow?
          </p>
          <Button variant="outline" asChild className="glass hover:bg-muted/50 rounded-xl">
            <Link href="#">
              View API Documentation
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// FAQ Section
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: 'How does voice-to-CRM work?',
      answer: 'Simply record your sales conversation using our mobile app or web interface. Our AI transcribes the audio in real-time, extracts key information like names, phone numbers, budgets, and follow-up dates, and automatically creates or updates the lead record. It works with Hindi, English, Hinglish, and 10+ other languages.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use bank-grade encryption (AES-256) for all data at rest and in transit. Our servers are hosted in India to comply with data localization requirements. We are ISO 27001 certified and conduct regular security audits.'
    },
    {
      question: 'Can I import my existing leads?',
      answer: 'Yes! We support bulk import from Excel, CSV, and direct migration from other CRMs like Salesforce, HubSpot, and Zoho. Our team will help you migrate data for free during onboarding.'
    },
    {
      question: 'What languages does voice recognition support?',
      answer: 'We support Hindi, English, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi, and more. Our AI also understands code-switching (mixing languages) which is common in Indian business conversations.'
    },
    {
      question: 'Is there a mobile app?',
      answer: 'Yes, we have native iOS and Android apps with full offline support. Record voice notes, update leads, and plan routes even without internet. Data syncs automatically when you are back online.'
    },
    {
      question: 'What kind of support do you offer?',
      answer: 'All plans include email support with 24-hour response time. Professional plans get priority support with 4-hour response and dedicated onboarding. Enterprise plans include 24/7 phone support and a dedicated account manager.'
    }
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <Badge variant="outline" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Frequently Asked
            <span className="text-primary"> Questions</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Everything you need to know about OrbitCRM
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold pr-4">{faq.question}</span>
                <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection() {
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    async function fetchTasks() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('tasks')
          .select('*, lead:leads(full_name, company)')
          .eq('is_completed', false)
          .order('due_date', { ascending: true })
          .limit(2)

        if (data && data.length > 0) {
          setTasks(data.map((t: any) => {
            const dateObj = new Date(t.due_date)
            const isTodayVal = dateObj.toDateString() === new Date().toDateString()
            return {
              id: t.id,
              title: t.title,
              timeLabel: `${isTodayVal ? 'Today' : 'Tomorrow'} ${dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
              leadName: t.lead?.full_name || 'Contact',
              type: t.title.toLowerCase().includes('whatsapp') ? 'whatsapp' : 'phone'
            }
          }))
        } else {
          setTasks([
            {
              id: 'mock-1',
              title: 'Call Rajesh Mehta for WhatsApp demo',
              timeLabel: 'Today 03:30 PM',
              leadName: 'Rajesh Mehta',
              type: 'phone'
            },
            {
              id: 'mock-2',
              title: 'Send GST quotation on WhatsApp',
              timeLabel: 'Tomorrow 11:30 AM',
              leadName: 'Mehta Group',
              type: 'whatsapp'
            }
          ])
        }
      } catch (err) {
        setTasks([
          {
            id: 'mock-1',
            title: 'Call Rajesh Mehta for WhatsApp demo',
            timeLabel: 'Today 03:30 PM',
            leadName: 'Rajesh Mehta',
            type: 'phone'
          },
          {
            id: 'mock-2',
            title: 'Send GST quotation on WhatsApp',
            timeLabel: 'Tomorrow 11:30 AM',
            leadName: 'Mehta Group',
            type: 'whatsapp'
          }
        ])
      }
    }
    fetchTasks()
  }, [])

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-12 items-center bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800/80 p-8 md:p-14 rounded-3xl relative overflow-hidden shadow-2xl">
          {/* Subtle cosmic glow effects */}
          <div className="absolute -right-20 -bottom-20 size-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />
          <div className="absolute -left-20 -top-20 size-80 bg-accent/5 blur-[100px] rounded-full pointer-events-none -z-10" />

          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 text-left flex flex-col items-start">
            <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/20">Action Center</Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-balance leading-tight text-white">
              All-in-One Powerful
              <br />
              <span className="gradient-text animate-gradient">CRM Tools with Orbit</span>
            </h2>
            <p className="mt-4 text-base text-zinc-300 text-pretty leading-relaxed max-w-xl">
              Improve efficiency with an all-in-one CRM software built for modern sales teams. OrbitCRM helps you organize leads, automate task lists, and run speech updates without added complexity.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-start gap-4 w-full sm:w-auto">
              <Button size="lg" asChild className="w-full sm:w-auto h-12 px-8 text-sm shadow-lg shadow-primary/25 bg-primary hover:bg-primary/95 text-white transition-all duration-200">
                <Link href="/login">
                  Get started for free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-12 px-8 text-sm glass hover:bg-muted/50 text-white border-zinc-700/80">
                <Link href="#">
                  View product demo
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Floating glassmorphism card widget */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-6 relative animate-float">
              {/* Top Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Upcoming Tasks</span>
                </div>
                {/* 3dots menu SVG */}
                <svg className="size-5 text-zinc-400 cursor-pointer hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </div>

              {/* Task Items */}
              <div className="flex flex-col gap-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex flex-col gap-2">
                    {/* Time Label Row */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{task.timeLabel.split(' ')[0]}</span>
                      <span className="text-[10px] text-zinc-500">{task.timeLabel.split(' ').slice(1).join(' ')}</span>
                    </div>

                    {/* Task Body Row */}
                    <div className="group flex items-center gap-3.5 p-4 rounded-xl border border-white/5 bg-zinc-950/60 hover:bg-zinc-950/90 hover:border-primary/20 transition-all duration-300 shadow-inner">
                      <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${task.type === 'whatsapp'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-primary/10 text-primary'
                        }`}>
                        {task.type === 'whatsapp' ? (
                          <MessageSquare className="size-4.5" />
                        ) : (
                          <Phone className="size-4.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-white truncate leading-normal">{task.title}</span>
                        <span className="block text-[9px] text-zinc-400 mt-0.5 truncate uppercase tracking-wider">Lead: {task.leadName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Footer
function Footer() {
  return (
    <footer className="border-t py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
                <Zap className="size-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">OrbitCRM</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              India&apos;s first voice-native CRM built for modern sales teams.
              Manage leads, track conversations, and close deals faster.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button variant="outline" size="icon" className="size-9">
                <Globe className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-9">
                <MessageSquare className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-9">
                <Mail className="size-4" />
              </Button>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="#integrations" className="hover:text-foreground transition-colors">Integrations</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">API Docs</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Press Kit</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Tutorials</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Webinars</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Case Studies</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Community</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Security</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">GDPR</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-8">
          <p className="text-sm text-muted-foreground">
            © 2026 OrbitCRM. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Made with care in India</span>
            <Badge variant="outline" className="text-xs">SOC 2 Certified</Badge>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Main Landing Page
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <IndustriesSection />
        <IntegrationsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
