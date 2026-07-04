'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Navigation, Footer } from '@/components/landing-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Building2, Briefcase, ShoppingBag, Factory, Shield, 
  Terminal, Code2, BookOpen, User, Calendar, Clock,
  ArrowRight, Search, CheckCircle2, MessageSquare, Phone, HelpCircle,
  PlayCircle, Users, ExternalLink, ShieldCheck, FileText, Lock
} from 'lucide-react'

export default function DynamicDocPage() {
  const params = useParams()
  const router = useRouter()
  const slug = (params?.slug as string) || ''
  
  const [mounted, setMounted] = useState(false)
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'python'>('curl')
  const [helpSearch, setHelpSearch] = useState('')
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const [contactData, setContactData] = useState({ name: '', email: '', message: '' })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-background" />
  }

  // Define contents mapping
  const isValidSlug = [
    'api-docs', 'changelog', 'about', 'careers', 'blog', 'press', 'contact',
    'help', 'tutorials', 'webinars', 'case-studies', 'community',
    'privacy', 'terms', 'security', 'gdpr', 'cookies'
  ].includes(slug)

  // Redirect to home if invalid slug
  if (!isValidSlug) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
          <Badge variant="outline" className="mb-4 text-red-500 border-red-500/20 bg-red-500/5">404 Error</Badge>
          <h1 className="text-4xl font-black tracking-tight">Page Not Found</h1>
          <p className="text-muted-foreground mt-2 max-w-sm">The document or page you are looking for does not exist.</p>
          <Button className="mt-6" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  const renderContent = () => {
    switch (slug) {
      case 'api-docs':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl font-bold">OrbitCRM Voice Extraction API</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Integrate OrbitCRM's proprietary Hinglish & regional voice intelligence directly into your existing calling apps, telephony setups, or custom field tools. Send raw audio recordings, get back structured lead payloads instantly.
              </p>
              
              <div className="space-y-4">
                <div className="border border-border/40 rounded-2xl p-5 bg-card/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <span className="font-mono text-xs font-semibold">/api/v1/voice/extract</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Transcribes and extracts structured parameters from audio logs.</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Request Parameters</h3>
                  <div className="border border-border/40 rounded-2xl overflow-hidden text-xs">
                    <div className="grid grid-cols-3 bg-muted/30 p-2.5 font-bold border-b border-border/30">
                      <span>Parameter</span>
                      <span>Type</span>
                      <span>Description</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 border-b border-border/10 font-mono">
                      <span className="text-primary">audio_file</span>
                      <span className="text-muted-foreground">file</span>
                      <span className="font-sans text-[11px]">Multipart form audio binary (wav, mp3, m4a)</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 font-mono">
                      <span className="text-primary">context_hints</span>
                      <span className="text-muted-foreground">string</span>
                      <span className="font-sans text-[11px]">Optional tags like local city or agent profile</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Code Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-zinc-950">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Terminal className="size-3.5" /> API Request</span>
                  <div className="flex gap-1.5">
                    {['curl', 'js', 'python'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveLang(lang as any)}
                        className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold transition-colors ${activeLang === lang ? 'bg-primary text-primary-foreground' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed min-h-[220px]">
                  {activeLang === 'curl' && `curl -X POST https://api.orbitcrm.in/v1/voice/extract \\
  -H "Authorization: Bearer ORBIT_SEC_KEY" \\
  -F "audio_file=@sales_pitch_hinglish.wav" \\
  -F "context_hints=real-estate-noida"`}
                  {activeLang === 'js' && `const formData = new FormData();
formData.append('audio_file', fileInput.files[0]);
formData.append('context_hints', 'real-estate-noida');

const res = await fetch('https://api.orbitcrm.in/v1/voice/extract', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ORBIT_SEC_KEY' },
  body: formData
});
const data = await res.json();`}
                  {activeLang === 'python' && `import requests

url = "https://api.orbitcrm.in/v1/voice/extract"
files = {'audio_file': open('sales_pitch.wav', 'rb')}
data = {'context_hints': 'real-estate-noida'}
headers = {"Authorization": "Bearer ORBIT_SEC_KEY"}

response = requests.post(url, files=files, data=data, headers=headers)
print(response.json())`}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
                <div className="px-4 py-2 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Code2 className="size-3.5" /> API Response</span>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-0 font-mono text-[9px]">200 OK</Badge>
                </div>
                <div className="p-4 font-mono text-xs text-zinc-400 overflow-x-auto whitespace-pre leading-relaxed">
{`{
  "success": true,
  "transcript": "Haan, client Noida Sector 62 me 3BHK flat dekh raha hai budget 1.5 Crores hai.",
  "extracted_data": {
    "lead_name": "Unknown Client",
    "budget": 15000000,
    "location": "Noida Sector 62",
    "category": "3BHK Flat",
    "buying_intent": "hot",
    "follow_up_date": null
  }
}`}
                </div>
              </div>
            </div>
          </div>
        )
      case 'changelog':
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold">Product Updates & Releases</h2>
            
            <div className="relative border-l border-border pl-6 space-y-12">
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 size-4 rounded-full bg-primary border-4 border-background" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-muted-foreground">MAY 2026</span>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">v2.4.0</Badge>
                  </div>
                  <h3 className="text-lg font-bold">Hinglish Voice Intelligence Integration</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Released the newly optimized voice processing engine that detects mixed regional dialects (Hinglish, Tamil-English) with a 92% accuracy level, logging data to CRM instantly.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 size-4 rounded-full bg-border border-4 border-background" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-muted-foreground">APRIL 2026</span>
                    <Badge variant="outline" className="border-border">v2.3.0</Badge>
                  </div>
                  <h3 className="text-lg font-bold">Native WhatsApp API Integration</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You can now directly connect your official Meta WhatsApp Business API tokens. Broadcast automated templates and sync lead conversations in real time.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 size-4 rounded-full bg-border border-4 border-background" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-muted-foreground">MARCH 2026</span>
                    <Badge variant="outline" className="border-border">v2.2.0</Badge>
                  </div>
                  <h3 className="text-lg font-bold">Route Optimization for Field Sales</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Empower on-field sales agents with direct geographical routing options to schedule visit logs with multiple clients in Tier-1 and Tier-2 locations sequentially.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'about':
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold">About OrbitCRM</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We started OrbitCRM with a simple premise: <strong>Sales reps spend too much time typing updates instead of talking to clients.</strong>
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              In India, where sales calls are often conducted in native dialects like Hindi, Tamil, Hinglish, or Marathi, traditional English-first CRMs create massive friction. OrbitCRM was built from scratch to be voice-first, multi-lingual, and optimized for real-time mobile workforces.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 border rounded-2xl text-center bg-card/30">
                <div className="text-3xl font-bold text-primary">10k+</div>
                <div className="text-xs text-muted-foreground mt-1">Active Sales Reps</div>
              </div>
              <div className="p-4 border rounded-2xl text-center bg-card/30">
                <div className="text-3xl font-bold text-primary">2.5M+</div>
                <div className="text-xs text-muted-foreground mt-1">Calls Synced</div>
              </div>
              <div className="p-4 border rounded-2xl text-center bg-card/30">
                <div className="text-3xl font-bold text-primary">94%</div>
                <div className="text-xs text-muted-foreground mt-1">Win-Rate Accuracy</div>
              </div>
            </div>
          </div>
        )
      case 'careers':
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold">Join Our Team</h2>
                <p className="text-muted-foreground text-sm mt-1">Build India's first voice-native CRM platform.</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500">We are Hiring</Badge>
            </div>
            
            <div className="space-y-4 pt-4">
              {[
                { title: 'Senior AI Speech Engineer', dept: 'Engineering', loc: 'Bangalore / Remote', type: 'Full-Time' },
                { title: 'Product UI Designer', dept: 'Design', loc: 'Mumbai / Hybrid', type: 'Full-Time' },
                { title: 'Frontend Developer (Next.js/React)', dept: 'Engineering', loc: 'Remote', type: 'Contract / Full-Time' },
                { title: 'Enterprise Account Executive', dept: 'Sales', loc: 'Delhi NCR', type: 'Full-Time' }
              ].map((job) => (
                <div key={job.title} className="p-5 border rounded-2xl bg-card/20 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">{job.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{job.dept}</span>
                      <span>•</span>
                      <span>{job.loc}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px]">{job.type}</Badge>
                    <Button size="sm" onClick={() => toast.success("Application Form Submitted!")} className="text-xs rounded-lg">Apply Now</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'blog':
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Inside OrbitCRM</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'How AI Voice Transcription Increases CRM Adoption by 80%',
                  desc: 'Traditional data entry causes sales reps to skip CRM logs. Voice updates solve the root problem.',
                  date: 'May 12, 2026',
                  author: 'Vikram Mehta'
                },
                {
                  title: 'WhatsApp Business API Best Practices for Sales Teams',
                  desc: 'Understand Meta policies, optimize broadcast schedules, and manage high-volume customer chats.',
                  date: 'April 28, 2026',
                  author: 'Priya Nair'
                },
                {
                  title: 'Reducing Operational Mileage by 30% with Routing Systems',
                  desc: 'A detailed look at field sales scheduling algorithms and live tracking mechanics.',
                  date: 'March 15, 2026',
                  author: 'Amit Patel'
                }
              ].map((post) => (
                <Card key={post.title} className="overflow-hidden flex flex-col justify-between rounded-2xl border border-border/40 hover:-translate-y-1 transition-all duration-300">
                  <CardHeader className="p-5">
                    <Badge className="w-fit text-[9px] mb-2">Strategy</Badge>
                    <CardTitle className="text-sm font-bold leading-snug">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{post.desc}</p>
                    <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground pt-4 border-t border-border/10">
                      <span>By {post.author}</span>
                      <span>{post.date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      case 'press':
        return (
          <div className="space-y-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold">Press Kit & Brand Assets</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Find logos, official assets, and brand guidelines for OrbitCRM. Use the resources provided here to feature OrbitCRM in media reports, blogs, or articles.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-5 border rounded-2xl bg-card/20 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Official Logo Pack</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">High-res PNG, SVG vectors</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.success("Download Started!")}>Download</Button>
              </div>
              <div className="p-5 border rounded-2xl bg-card/20 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Product Screenshots</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Dashboard UI, WhatsApp views</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.success("Download Started!")}>Download</Button>
              </div>
            </div>
          </div>
        )
      case 'contact':
        return (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Talk to Sales & Support</h2>
              <p className="text-xs text-muted-foreground">Have questions about integrations or enterprise onboarding? Let us know.</p>
            </div>
            
            {contactSubmitted ? (
              <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-lg">Message Submitted!</h3>
                <p className="text-xs text-muted-foreground">Our team will get back to you within 2 business hours.</p>
                <Button variant="outline" onClick={() => { setContactSubmitted(false); setContactData({ name: '', email: '', message: '' }) }}>Send another message</Button>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!contactData.name || !contactData.email || !contactData.message) {
                    toast.error("Please fill in all fields")
                    return
                  }
                  setContactSubmitted(true)
                }}
                className="space-y-4 p-6 border rounded-2xl bg-card/10 backdrop-blur-sm"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Your Name</label>
                  <Input 
                    type="text" 
                    placeholder="Enter name"
                    value={contactData.name} 
                    onChange={e => setContactData({ ...contactData, name: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Business Email</label>
                  <Input 
                    type="email" 
                    placeholder="Enter email"
                    value={contactData.email} 
                    onChange={e => setContactData({ ...contactData, email: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Message</label>
                  <Textarea 
                    rows={4} 
                    placeholder="How can we help your sales team?"
                    value={contactData.message} 
                    onChange={e => setContactData({ ...contactData, message: e.target.value })} 
                  />
                </div>
                <Button type="submit" className="w-full">Submit Inquiry</Button>
              </form>
            )}
          </div>
        )
      case 'help':
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">OrbitCRM Help Center</h2>
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search documentation, guides, and FAQs..." 
                  className="pl-9 rounded-xl"
                  value={helpSearch}
                  onChange={e => setHelpSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {[
                { title: 'Voice Sync Setup', count: '12 articles', desc: 'Dialects, transcription formats, language configuration.' },
                { title: 'WhatsApp Business API', count: '8 articles', desc: 'Connecting templates, broadcast rules, webhook configuration.' },
                { title: 'Leads & Pipeline', count: '15 articles', desc: 'CSV formats, custom stages, routing parameters.' }
              ].map((category) => (
                <div key={category.title} className="p-5 border rounded-2xl bg-card/20 hover:border-primary/20 transition-all space-y-2">
                  <HelpCircle className="size-6 text-primary" />
                  <h3 className="font-bold text-sm">{category.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{category.desc}</p>
                  <span className="text-[10px] font-semibold text-primary block pt-2">{category.count} →</span>
                </div>
              ))}
            </div>
          </div>
        )
      case 'tutorials':
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold">Video Tutorials & Walkthroughs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Setting Up Voice CRM in 5 Minutes', duration: '4:52', desc: 'Learn how to enable mixed-language transcribing on the field sales app.' },
                { title: 'Connecting official Meta WhatsApp Templates', duration: '7:15', desc: 'Step by step checklist to deploy and send your first broadcast template.' },
                { title: 'Optimizing Route Management maps', duration: '5:30', desc: 'Deploy automatic route optimization arrays for your field sales representatives.' },
                { title: 'Understanding AI buying intent indicators', duration: '3:45', desc: 'A deep dive into how sentiment and deal parameters are auto-calculated.' }
              ].map((tut) => (
                <div key={tut.title} className="border rounded-2xl overflow-hidden bg-card/10 flex flex-col justify-between">
                  <div className="relative aspect-video w-full bg-zinc-900 flex items-center justify-center">
                    <PlayCircle className="size-12 text-primary/80 hover:text-primary hover:scale-110 transition-all cursor-pointer" />
                    <span className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white">{tut.duration}</span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="font-semibold text-sm leading-snug">{tut.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tut.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'webinars':
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold">Webinars & On-Demand Sessions</h2>
            <div className="space-y-4">
              {[
                { title: 'Scale Your Sales Playbook with Voice-Native Workflows', date: 'June 4, 2026', time: '3:00 PM IST', host: 'Vikram Mehta (Sales Director)' },
                { title: 'Leveraging WhatsApp Broadcasts for Multi-Channel Conversions', date: 'June 18, 2026', time: '11:00 AM IST', host: 'Priya Nair (Product Team)' }
              ].map((web) => (
                <div key={web.title} className="p-5 border rounded-2xl bg-card/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-primary uppercase">{web.date} @ {web.time}</span>
                    <h3 className="font-semibold text-sm leading-snug">{web.title}</h3>
                    <p className="text-xs text-muted-foreground">Hosted by {web.host}</p>
                  </div>
                  <Button size="sm" onClick={() => toast.success("Registered Successfully!")}>Register</Button>
                </div>
              ))}
            </div>
          </div>
        )
      case 'case-studies':
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold">Customer Success Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'How TechCorp Saved 2 Hours Daily Per Rep', win: '40% win rate boost', desc: 'TechCorp deployed OrbitCRM across 150+ field sales executives to transcribe customer check-ins instantly in regional dialects.' },
                { title: 'RetailMax WhatsApp Strategy Scaling 5x', win: '5x query volume growth', desc: 'Integrating custom broadcast flows enabled RetailMax to handle thousands of inbound queries with custom intent categorization.' }
              ].map((cs) => (
                <div key={cs.title} className="p-6 border rounded-2xl bg-card/20 flex flex-col justify-between hover:border-primary/20 transition-all">
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">{cs.win}</Badge>
                    <h3 className="font-bold text-sm leading-snug">{cs.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cs.desc}</p>
                  </div>
                  <Button size="sm" variant="link" className="text-xs text-primary p-0 w-fit mt-4">Read Full Case Study →</Button>
                </div>
              ))}
            </div>
          </div>
        )
      case 'community':
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold">OrbitCRM Community</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Connect with developers, partners, and sales leaders build integrations, sharing strategies, and developing plugins for OrbitCRM.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-5 border rounded-2xl text-center space-y-2 bg-card/30">
                <Users className="size-6 text-primary mx-auto" />
                <h3 className="font-bold text-sm">Developer Slack</h3>
                <p className="text-[10px] text-muted-foreground">Join 2,500+ integrators</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => toast.info("Opening Slack Invite Link...")}>Join Slack</Button>
              </div>
              <div className="p-5 border rounded-2xl text-center space-y-2 bg-card/30">
                <ExternalLink className="size-6 text-primary mx-auto" />
                <h3 className="font-bold text-sm">GitHub Community</h3>
                <p className="text-[10px] text-muted-foreground">Contribute to open plugins</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => toast.info("Opening GitHub Repositories...")}>Open GitHub</Button>
              </div>
              <div className="p-5 border rounded-2xl text-center space-y-2 bg-card/30">
                <MessageSquare className="size-6 text-primary mx-auto" />
                <h3 className="font-bold text-sm">Sales Forums</h3>
                <p className="text-[10px] text-muted-foreground">Exchange playbook guides</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => toast.info("Opening Community Forum...")}>Visit Forum</Button>
              </div>
            </div>
          </div>
        )
      case 'privacy':
      case 'terms':
      case 'security':
      case 'gdpr':
      case 'cookies':
        return (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-8 text-primary" />
              <h2 className="text-2xl font-bold uppercase tracking-wide">{slug} Policy Document</h2>
            </div>
            <div className="p-6 border border-border/40 rounded-2xl bg-card/15 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <p className="font-bold text-foreground">Last Updated: May 2026</p>
              <p>
                This document details the regulatory compliance, cookies consent tracking, data storage protocols, and terms configurations corresponding to OrbitCRM services operated under compliance frameworks in India.
              </p>
              <p>
                We use secure, end-to-end TLS encryption protocol arrays for every meta-API token processed on our dashboard systems. All audio recordings, transcripts, and database rows are stored natively in region-restricted instances to comply with local storage mandates.
              </p>
              <p>
                We strictly adhere to ethical data processing standards. You maintain complete ownership of every lead detail parsed by OrbitCRM AI services. For inquiries or updates regarding database removal, configure options inside settings or submit a request directly to support.
              </p>
              
              {slug === 'cookies' && (
                <div className="pt-4 border-t border-border/10 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <span className="text-foreground font-semibold block text-sm">Manage Cookie Preferences</span>
                    <p className="text-[10px]">Customize how OrbitCRM tracks usage logs across sessions.</p>
                  </div>
                  <Button size="sm" onClick={() => toast.success("Preferences Saved!")}>Accept Essential Cookies Only</Button>
                </div>
              )}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Find dynamic titles
  const getTitles = () => {
    const data: Record<string, { title: string; subtitle: string; category: string }> = {
      'api-docs': { title: 'Developer API Documentation', subtitle: 'Integrate multi-language voice transcription arrays', category: 'Product' },
      'changelog': { title: 'Product Changelog', subtitle: 'Discover the latest releases and fixes', category: 'Product' },
      'about': { title: 'About OrbitCRM', subtitle: 'Stop typing. Start talking.', category: 'Company' },
      'careers': { title: 'Careers', subtitle: 'Help us redefine sales tools for everyone', category: 'Company' },
      'blog': { title: 'Company Blog', subtitle: 'Playbooks, engineering, and sales strategy', category: 'Company' },
      'press': { title: 'Press Kit', subtitle: 'Brand assets and guidelines', category: 'Company' },
      'contact': { title: 'Contact Us', subtitle: 'Reach out to our teams around the clock', category: 'Company' },
      'help': { title: 'Knowledge Base', subtitle: 'Articles, setups, and FAQs', category: 'Resources' },
      'tutorials': { title: 'Video Tutorials', subtitle: 'Setup guides and screen walkthroughs', category: 'Resources' },
      'webinars': { title: 'Webinars', subtitle: 'On-demand recordings and upcoming sessions', category: 'Resources' },
      'case-studies': { title: 'Case Studies', subtitle: 'How Indian sales teams thrive with OrbitCRM', category: 'Resources' },
      'community': { title: 'Developer Community', subtitle: 'Contribute and exchange ideas', category: 'Resources' },
      'privacy': { title: 'Privacy Policy', subtitle: 'How we guard your leads & transcript records', category: 'Legal' },
      'terms': { title: 'Terms of Service', subtitle: 'General terms and pricing agreements', category: 'Legal' },
      'security': { title: 'Security & Encryption', subtitle: 'Data localization and Meta tokens', category: 'Legal' },
      'gdpr': { title: 'GDPR Compliance', subtitle: 'Lead tracking consents and user controls', category: 'Legal' },
      'cookies': { title: 'Cookie Policy', subtitle: 'Session storage and preferences', category: 'Legal' }
    }
    return data[slug] || { title: 'Document', subtitle: 'Overview', category: 'System' }
  }

  const { title, subtitle, category } = getTitles()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 py-16 md:py-24 relative overflow-hidden">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10" />
        <div className="absolute top-[-10%] left-[-10%] size-[400px] rounded-full bg-gradient-to-br from-violet-600/10 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] size-[400px] rounded-full bg-gradient-to-br from-emerald-600/10 to-transparent blur-[120px] pointer-events-none -z-10" />

        <div className="container mx-auto px-4">
          {/* Header breadcrumb */}
          <div className="max-w-4xl mx-auto mb-10 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-8">
              <div className="space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/85">
                  <span>{category}</span>
                  <span>/</span>
                  <span className="text-primary font-bold">{slug}</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg shrink-0 self-center md:self-end" onClick={() => router.back()}>
                ← Back
              </Button>
            </div>
          </div>

          {/* Dynamic Content Body */}
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
