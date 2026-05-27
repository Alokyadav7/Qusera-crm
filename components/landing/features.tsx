"use client"
import { Mic, MessageSquare, Zap, Shield, Languages, Brain, TrendingUp, Target, Phone, FileText, Users, MapPin, Clock, CheckCircle2, Building2, BarChart3 } from 'lucide-react'
import { useState } from 'react'

const CATEGORIES = [
  {
    id: 'voice', label: 'Voice Intelligence', icon: Mic,
    features: [
      { icon: Languages, title: 'Multi-Language Transcription', desc: 'Hindi, English, Hinglish, Tamil and 10+ languages — our AI understands how India speaks.' },
      { icon: Brain, title: 'Smart Data Extraction', desc: 'AI pulls names, phones, budgets and dates from conversations automatically.' },
      { icon: TrendingUp, title: 'Sentiment Analysis', desc: 'Know if a lead is hot, warm, or cold based on tone and keywords in real time.' },
      { icon: Target, title: 'Action Item Detection', desc: 'Commitments become tasks automatically. Never miss a follow-up again.' },
    ]
  },
  {
    id: 'comm', label: 'Unified Inbox', icon: MessageSquare,
    features: [
      { icon: Phone, title: 'WhatsApp Business API', desc: 'All chats in one inbox. Auto-capture leads from every message.' },
      { icon: FileText, title: 'Smart Templates', desc: 'AI-suggested responses based on context. One click to send.' },
      { icon: Users, title: 'Broadcast Campaigns', desc: 'Targeted campaigns to lead segments with delivery and read tracking.' },
      { icon: Mic, title: 'Call Recording & Logging', desc: 'Every call transcribed and stored. Full customer touchpoint history.' },
    ]
  },
  {
    id: 'auto', label: 'Automation', icon: Zap,
    features: [
      { icon: BarChart3, title: 'Lead Scoring', desc: 'AI scores leads on behavior, engagement and sentiment automatically.' },
      { icon: Target, title: 'Workflow Builder', desc: 'Drag-and-drop automations for nurturing. Trigger on any lead event.' },
      { icon: MapPin, title: 'Route Optimization', desc: 'AI plans efficient visit routes. Save fuel and time on field trips.' },
      { icon: Clock, title: 'Smart Reminders', desc: 'Follow-up alerts at the optimal time based on lead timezone.' },
    ]
  },
  {
    id: 'comp', label: 'Compliance', icon: Shield,
    features: [
      { icon: CheckCircle2, title: 'GST Verification', desc: 'Instant GSTIN validation with auto-fetched company details.' },
      { icon: FileText, title: 'PAN & Aadhaar KYC', desc: 'Built-in identity verification for compliance. Secure and instant.' },
      { icon: Building2, title: 'Bank Verification', desc: 'Verify bank details before processing payments. Reduce fraud.' },
      { icon: Shield, title: 'Full Audit Trail', desc: 'Complete history of all changes. Stay compliant with regulations.' },
    ]
  },
]

export function FeaturesSection() {
  const [active, setActive] = useState('voice')
  const cat = CATEGORIES.find(c => c.id === active)!

  return (
    <section id="features" className="py-20 bg-background border-t border-border/60">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-6">
            Features
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Built for modern workflows
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Every step of your sales pipeline is covered, from initial voice lead capture to automated follow-up.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-border/40 pb-6 max-w-2xl mx-auto">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                active === c.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <c.icon className="size-3.5" />
              {c.label}
            </button>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="mx-auto max-w-4xl grid sm:grid-cols-2 gap-6">
          {cat.features.map(f => (
            <div
              key={f.title}
              className="flex gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-border transition-all"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground border border-border/30">
                <f.icon className="size-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
