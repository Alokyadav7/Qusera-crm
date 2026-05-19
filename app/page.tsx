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
  LucideIcon
} from 'lucide-react'
import { useState } from 'react'

// Navigation Component
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="size-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">OrbitCRM</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link href="#why-voice" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Why Voice CRM
          </Link>
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
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Start Free Trial</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-background">
          <nav className="container mx-auto flex flex-col gap-4 p-4">
            <Link href="#why-voice" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Why Voice CRM
            </Link>
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

// Hero Section with Dashboard Preview
function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 lg:py-40 hero-gradient">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm mb-8 animate-fade-in-up">
            <Sparkles className="size-4 text-primary animate-pulse" />
            <span className="font-medium text-primary">Introducing AI-Powered Voice CRM</span>
            <ChevronRight className="size-4 text-primary" />
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-balance animate-fade-in-up delay-100">
            Stop Typing.
            <br />
            <span className="gradient-text animate-gradient">Start Talking.</span>
          </h1>
          
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground md:text-xl text-pretty leading-relaxed animate-fade-in-up delay-200">
            The first CRM that listens to your sales conversations, extracts insights in real-time, 
            and automatically updates your pipeline. In Hindi, English, or any language you speak.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up delay-300">
            <Button size="lg" asChild className="w-full sm:w-auto h-14 px-8 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              <Link href="/login">
                Start Free Trial
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-14 px-8 text-base glass hover:bg-muted/50">
              <Link href="#demo">
                <Play className="mr-2 size-5" />
                Watch Demo
              </Link>
            </Button>
          </div>
          
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground animate-fade-in-up delay-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Setup in 5 minutes</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mx-auto mt-20 max-w-6xl animate-fade-in-up delay-500">
          <div className="relative rounded-2xl glass-card glow-primary overflow-hidden card-hover">
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 bg-muted/40 backdrop-blur-md">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-destructive/80" />
                <div className="size-3 rounded-full bg-amber-500/80" />
                <div className="size-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="rounded-md bg-background/50 px-3 py-1 text-xs text-muted-foreground font-mono">
                  app.orbitcrm.in/dashboard
                </div>
              </div>
            </div>
            <div className="aspect-video mesh-gradient flex items-center justify-center relative">
              {/* Simulated Dashboard UI */}
              <div className="absolute inset-6 grid grid-cols-12 gap-6">
                {/* Sidebar */}
                <div className="col-span-2 hidden lg:flex flex-col gap-3">
                  <div className="h-10 rounded-xl bg-primary/20 glass" />
                  <div className="flex-1 space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`h-8 rounded-lg glass ${i === 0 ? 'bg-primary/30 border-primary/50' : 'bg-muted/20'}`} />
                    ))}
                  </div>
                </div>
                {/* Main Content */}
                <div className="col-span-12 lg:col-span-10 space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-24 rounded-xl glass-card p-4 flex flex-col justify-between">
                        <div className="h-3 w-16 rounded bg-muted-foreground/30" />
                        <div className="h-6 w-20 rounded bg-primary/40" />
                      </div>
                    ))}
                  </div>
                  {/* Charts Row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 h-48 rounded-xl glass-card p-4 flex flex-col justify-between">
                      <div className="h-3 w-24 rounded bg-muted-foreground/30 mb-3" />
                      <div className="flex items-end gap-2 h-32">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 65].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/20 to-primary/60" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="h-48 rounded-xl glass-card p-4 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute top-4 left-4 h-3 w-20 rounded bg-muted-foreground/30" />
                      <div className="size-28 rounded-full border-8 border-primary/20 border-t-primary/80 animate-spin-slow" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Voice Recording Overlay */}
              <div className="absolute bottom-8 right-8 flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-2xl shadow-primary/50 animate-float">
                <Mic className="size-5 animate-pulse" />
                <span className="text-sm font-semibold tracking-wide">AI Listening...</span>
                <div className="flex gap-1 ml-2">
                  <div className="wave-bar h-4" />
                  <div className="wave-bar h-6" />
                  <div className="wave-bar h-3" />
                  <div className="wave-bar h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted By Logos */}
        <div className="mx-auto mt-24 max-w-4xl animate-fade-in-up delay-600">
          <p className="text-center text-sm font-medium tracking-widest uppercase text-muted-foreground mb-8">Trusted by 10,000+ sales teams</p>
          <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {['TechCorp', 'GrowthBox', 'FinanceHub', 'RetailMax', 'ServicePro'].map((company) => (
              <div key={company} className="text-xl font-bold tracking-tighter">{company}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Why Voice CRM Section - Comparison
function WhyVoiceCRMSection() {
  const comparisons = [
    {
      feature: 'Data Entry',
      traditional: 'Manual typing after every call',
      voice: 'Automatic capture during conversation',
      traditionalIcon: Keyboard,
      voiceIcon: Mic
    },
    {
      feature: 'Time per Lead',
      traditional: '15-20 minutes',
      voice: '2-3 minutes',
      traditionalIcon: Timer,
      voiceIcon: Zap
    },
    {
      feature: 'Lead Insights',
      traditional: 'Basic notes & status',
      voice: 'AI sentiment, intent & action items',
      traditionalIcon: FileText,
      voiceIcon: Brain
    },
    {
      feature: 'Language Support',
      traditional: 'English only interfaces',
      voice: 'Hindi, English, Hinglish & 10+ languages',
      traditionalIcon: Globe,
      voiceIcon: Languages
    },
    {
      feature: 'Field Updates',
      traditional: 'Back at office only',
      voice: 'Real-time from anywhere',
      traditionalIcon: Building2,
      voiceIcon: MapPin
    },
    {
      feature: 'Accuracy',
      traditional: '60-70% data captured',
      voice: '95%+ with AI verification',
      traditionalIcon: Target,
      voiceIcon: CheckCircle2
    }
  ]

  return (
    <section id="why-voice" className="py-20 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-muted/30 -z-10" />
      <div className="absolute right-0 top-1/4 size-96 bg-primary/10 blur-[100px] -z-10 rounded-full" />
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-20 animate-fade-in-up">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/20 bg-primary/5 text-primary">Why Voice CRM?</Badge>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-balance">
            Traditional CRM is
            <span className="gradient-text"> Broken</span>
          </h2>
          <p className="mt-6 text-xl text-muted-foreground text-pretty">
            Sales reps spend more time typing than selling. Voice CRM changes everything 
            by capturing data naturally during conversations.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="mx-auto max-w-5xl animate-fade-in-up delay-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <Card className="glass border-rose-200/50 bg-rose-50/30 dark:bg-rose-950/20 dark:border-rose-900/50 shadow-lg shadow-rose-500/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shadow-inner">
                    <Keyboard className="size-7 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Traditional CRM</CardTitle>
                    <CardDescription className="text-base">The old way of doing things</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card className="glass-card glow-primary border-emerald-200/50 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-900/50 scale-105 shadow-xl shadow-emerald-500/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Mic className="size-7 text-white animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Voice-First CRM</CardTitle>
                    <CardDescription className="text-base text-emerald-700/80 dark:text-emerald-300/80 font-medium">The OrbitCRM advantage</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          <div className="space-y-4">
            {comparisons.map((item, i) => (
              <div key={item.feature} className={`grid grid-cols-1 md:grid-cols-[1fr_2fr_2fr] gap-4 items-center animate-fade-in-up`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="font-semibold text-center md:text-left text-lg">{item.feature}</div>
                <Card className="glass border-rose-100/50 dark:border-rose-900/30 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors">
                  <CardContent className="flex items-center gap-3 p-5">
                    <CircleX className="size-6 text-rose-500 shrink-0 opacity-80" />
                    <span className="text-base text-muted-foreground">{item.traditional}</span>
                  </CardContent>
                </Card>
                <Card className="glass-card border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 card-hover">
                  <CardContent className="flex items-center gap-3 p-5">
                    <CircleCheck className="size-6 text-emerald-500 shrink-0" />
                    <span className="text-base font-semibold">{item.voice}</span>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Bottom Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '3x', label: 'Faster Data Entry' },
              { value: '40%', label: 'More Leads Captured' },
              { value: '2hrs', label: 'Saved Per Day' },
              { value: '95%', label: 'Data Accuracy' }
            ].map((stat, i) => (
              <div key={stat.label} className="text-center p-6 rounded-2xl glass hover:bg-primary/5 transition-colors animate-fade-in-up" style={{ animationDelay: `${i * 100 + 300}ms` }}>
                <div className="text-4xl md:text-5xl font-extrabold gradient-text">{stat.value}</div>
                <div className="mt-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
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
                    <Card key={feature.title} className="glass-card card-hover animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                      <CardHeader className="p-8">
                        <div className="flex items-start gap-5">
                          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-primary-foreground transition-all duration-300 shadow-inner">
                            <feature.icon className="size-7" />
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
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Get Started in
            <span className="text-primary"> 4 Simple Steps</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            From signup to closing deals in under 10 minutes
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, index) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
                      {item.step}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 left-full w-full h-0.5 bg-border -translate-y-1/2">
                        <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex size-12 items-center justify-center rounded-lg bg-muted">
                    <item.icon className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
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

        <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-xl lg:scale-105 z-10' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary px-4 py-1">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  {plan.price !== 'Custom' && <span className="text-2xl">₹</span>}
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-3">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Minus className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${!feature.included && 'text-muted-foreground'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-4">
                <Button 
                  className="w-full" 
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
            See what sales leaders across India are saying about SalesPro CRM
          </p>
        </div>

        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1">
                  <TrendingUp className="size-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {testimonial.metric}
                  </span>
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <Avatar className="size-12 border-2 border-background shadow-sm">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
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
    { name: 'WhatsApp Business', category: 'Communication' },
    { name: 'Google Workspace', category: 'Productivity' },
    { name: 'Microsoft Teams', category: 'Productivity' },
    { name: 'Tally ERP', category: 'Accounting' },
    { name: 'Razorpay', category: 'Payments' },
    { name: 'Zoho Books', category: 'Accounting' },
    { name: 'Freshdesk', category: 'Support' },
    { name: 'Slack', category: 'Communication' },
    { name: 'Shopify', category: 'E-commerce' },
    { name: 'Zapier', category: 'Automation' },
    { name: 'Twilio', category: 'Communication' },
    { name: 'AWS', category: 'Infrastructure' }
  ]

  return (
    <section id="integrations" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <Badge variant="outline" className="mb-4">Integrations</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Connects With Your
            <span className="text-primary"> Favorite Tools</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Seamlessly integrate with 50+ tools your team already uses
          </p>
        </div>

        <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {integrations.map((integration) => (
            <Card key={integration.name} className="hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted mb-2">
                  <Globe className="size-6 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium">{integration.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Need a custom integration? Our API makes it easy.
          </p>
          <Button variant="outline" asChild>
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
  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-balance">
            Ready to Transform Your Sales?
          </h2>
          <p className="mt-4 text-lg opacity-90 text-pretty max-w-2xl mx-auto">
            Join 10,000+ sales teams already using OrbitCRM to close more deals faster.
            Start your free 14-day trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto h-12 px-8">
              <Link href="/login">
                Start Free Trial
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto h-12 px-8 bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground" 
              asChild
            >
              <Link href="#">
                <Phone className="mr-2 size-4" />
                Schedule Demo
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm opacity-75">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>Cancel anytime</span>
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
        <WhyVoiceCRMSection />
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
