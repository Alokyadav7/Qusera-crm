'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Code2, Key, Zap, BookOpen, ChevronRight, Copy, Check, ArrowRight, Shield, Globe, Database, FileText, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HttpMethod = 'GET' | 'POST'
interface Param { name: string; type: string; required: boolean; description: string }
interface Endpoint { id: string; method: HttpMethod; path: string; summary: string; description: string; body?: Param[]; responseExample: string; requestExample?: string }
interface ApiSection { id: string; label: string; icon: React.ElementType; color: string; endpoints: Endpoint[] }

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
}

const SECTIONS: ApiSection[] = [
  {
    id: 'leads', label: 'Leads', icon: TrendingUp, color: 'text-emerald-500',
    endpoints: [
      {
        id: 'get-leads', method: 'GET', path: '/api/v1/leads', summary: 'List all leads',
        description: 'Returns all leads for your organization ordered by creation date (newest first).',
        responseExample: '{\n  "data": [\n    {\n      "id": "uuid",\n      "full_name": "Ravi Kumar",\n      "email": "ravi@example.com",\n      "phone_number": "9876543210",\n      "buying_intent": "high",\n      "deal_value": 50000,\n      "created_at": "2026-05-01T10:00:00Z"\n    }\n  ]\n}',
      },
      {
        id: 'post-leads', method: 'POST', path: '/api/v1/leads', summary: 'Create a lead',
        description: 'Creates a new lead in your organization pipeline.',
        body: [
          { name: 'full_name', type: 'string', required: true, description: 'Full name of the lead' },
          { name: 'email', type: 'string', required: false, description: 'Email address' },
          { name: 'phone_number', type: 'string', required: false, description: 'Phone number' },
          { name: 'company', type: 'string', required: false, description: 'Company name' },
          { name: 'buying_intent', type: 'enum', required: false, description: '"low" | "medium" | "high"' },
          { name: 'deal_value', type: 'number', required: false, description: 'Estimated deal value in INR' },
        ],
        requestExample: '{\n  "full_name": "Ravi Kumar",\n  "email": "ravi@example.com",\n  "buying_intent": "high",\n  "deal_value": 50000\n}',
        responseExample: '{\n  "success": true,\n  "data": {\n    "id": "uuid",\n    "full_name": "Ravi Kumar",\n    "source": "api",\n    "created_at": "2026-05-01T10:00:00Z"\n  }\n}',
      },
    ],
  },
  {
    id: 'contacts', label: 'Contacts', icon: Users, color: 'text-blue-500',
    endpoints: [
      {
        id: 'get-contacts', method: 'GET', path: '/api/v1/contacts', summary: 'List all contacts',
        description: 'Returns all active contacts. Soft-deleted contacts are excluded.',
        responseExample: '{\n  "data": [\n    {\n      "id": "uuid",\n      "full_name": "Priya Sharma",\n      "email": "priya@example.com",\n      "company_name": "InnoTech",\n      "tags": ["enterprise"],\n      "created_at": "2026-04-15T08:00:00Z"\n    }\n  ]\n}',
      },
      {
        id: 'post-contacts', method: 'POST', path: '/api/v1/contacts', summary: 'Create a contact',
        description: 'Adds a new contact to your organization.',
        body: [
          { name: 'full_name', type: 'string', required: true, description: 'Full name' },
          { name: 'email', type: 'string', required: false, description: 'Email address' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number' },
          { name: 'company_name', type: 'string', required: false, description: 'Company name' },
          { name: 'designation', type: 'string', required: false, description: 'Job title' },
          { name: 'tags', type: 'string[]', required: false, description: 'Array of tag strings' },
        ],
        requestExample: '{\n  "full_name": "Priya Sharma",\n  "email": "priya@example.com",\n  "company_name": "InnoTech",\n  "tags": ["enterprise"]\n}',
        responseExample: '{\n  "success": true,\n  "data": {\n    "id": "uuid",\n    "full_name": "Priya Sharma",\n    "created_at": "2026-05-01T10:00:00Z"\n  }\n}',
      },
    ],
  },
  {
    id: 'deals', label: 'Deals', icon: Database, color: 'text-violet-500',
    endpoints: [
      {
        id: 'get-deals', method: 'GET', path: '/api/v1/deals', summary: 'List all deals',
        description: 'Returns all active deals. Soft-deleted deals are excluded.',
        responseExample: '{\n  "data": [\n    {\n      "id": "uuid",\n      "title": "Enterprise SaaS Package",\n      "value": 150000,\n      "currency": "INR",\n      "stage": "negotiation",\n      "probability": 70,\n      "created_at": "2026-05-01T10:00:00Z"\n    }\n  ]\n}',
      },
      {
        id: 'post-deals', method: 'POST', path: '/api/v1/deals', summary: 'Create a deal',
        description: 'Creates a new deal and optionally associates it with a contact.',
        body: [
          { name: 'title', type: 'string', required: true, description: 'Deal title / name' },
          { name: 'value', type: 'number', required: false, description: 'Deal value (default: 0)' },
          { name: 'currency', type: 'string', required: false, description: 'Currency code (default: "INR")' },
          { name: 'stage', type: 'enum', required: false, description: '"prospect"|"qualified"|"proposal"|"negotiation"|"won"|"lost"' },
          { name: 'close_date', type: 'string', required: false, description: 'Expected close date (ISO 8601)' },
          { name: 'contact_id', type: 'uuid', required: false, description: 'Associated contact UUID' },
          { name: 'probability', type: 'number', required: false, description: 'Win probability % (0-100)' },
        ],
        requestExample: '{\n  "title": "Enterprise SaaS Package",\n  "value": 150000,\n  "stage": "negotiation",\n  "probability": 70\n}',
        responseExample: '{\n  "success": true,\n  "data": {\n    "id": "uuid",\n    "title": "Enterprise SaaS Package",\n    "stage": "negotiation",\n    "created_at": "2026-05-01T10:00:00Z"\n  }\n}',
      },
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="p-1.5 rounded hover:bg-white/10 transition-colors text-zinc-500 hover:text-zinc-300" aria-label="Copy">
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  return (
    <div className="bg-zinc-950 dark:bg-black rounded-lg border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  )
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false)
  const curlBase = `curl -X ${ep.method} https://klinqcrm.in${ep.path} \\\n  -H "Authorization: Bearer YOUR_API_KEY"`
  const curlFull = ep.requestExample ? `${curlBase} \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.requestExample}'` : curlBase
  return (
    <div id={ep.id} className="border border-border rounded-xl overflow-hidden bg-card hover:border-foreground/20 transition-colors">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
        <code className="text-sm font-mono text-foreground flex-1 truncate">{ep.path}</code>
        <span className="text-xs text-muted-foreground hidden sm:block shrink-0">{ep.summary}</span>
        <ChevronRight className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border p-5 space-y-6 bg-background/50">
          <p className="text-sm text-muted-foreground leading-relaxed">{ep.description}</p>
          {ep.body && ep.body.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Request Body</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-3 py-2 font-semibold text-foreground/70 w-36">Field</th>
                    <th className="text-left px-3 py-2 font-semibold text-foreground/70 w-24">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-foreground/70 w-20">Required</th>
                    <th className="text-left px-3 py-2 font-semibold text-foreground/70">Description</th>
                  </tr></thead>
                  <tbody>
                    {ep.body.map((p, i) => (
                      <tr key={p.name} className={`border-b border-border last:border-0 ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}>
                        <td className="px-3 py-2.5 font-mono text-foreground font-medium">{p.name}</td>
                        <td className="px-3 py-2.5 font-mono text-violet-500 dark:text-violet-400">{p.type}</td>
                        <td className="px-3 py-2.5">{p.required ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">cURL Example</p>
            <CodeBlock code={curlFull} language="bash" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Response (200 OK)</p>
            <CodeBlock code={ep.responseExample} language="json" />
          </div>
        </div>
      )}
    </div>
  )
}

export function ApiDocsClient() {
  const [activeSection, setActiveSection] = useState('leads')
  const current = SECTIONS.find(s => s.id === activeSection)!
  return (
    <div className="min-h-screen">
      <section className="border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-6 py-14 md:py-20 max-w-5xl">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
              <Code2 className="size-3" /> Developer API — v1
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1] font-display">Klinq CRM API Reference</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">Push leads, sync contacts, and create deals programmatically using our REST API — secured by per-organization API keys.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-9 px-5 text-xs font-bold bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                <Link href="/contact" className="inline-flex items-center gap-1.5">Get API Access <ArrowRight className="size-3.5" /></Link>
              </Button>
              <Button variant="outline" asChild className="h-9 px-5 text-xs font-semibold cursor-pointer hover:border-foreground/40 transition-all">
                <Link href="/login">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">
        <div className="grid md:grid-cols-[220px_1fr] gap-8 items-start">
          <aside className="md:sticky md:top-20 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Overview</p>
              {[
                { icon: Globe,    label: 'Base URL', value: 'https://klinqcrm.in' },
                { icon: Shield,   label: 'Auth',     value: 'Bearer token' },
                { icon: FileText, label: 'Format',   value: 'JSON' },
                { icon: Zap,      label: 'Version',  value: 'v1' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card">
                  <item.icon className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-mono font-semibold text-foreground truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Resources</p>
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${activeSection === s.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                    <Icon className="size-3.5 shrink-0" />{s.label}
                  </button>
                )
              })}
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Key className="size-3 text-amber-500" />
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Auth Required</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">All endpoints require <code className="text-foreground bg-muted px-1 rounded text-[10px]">Authorization: Bearer YOUR_KEY</code>.</p>
            </div>
          </aside>

          <main className="space-y-8 min-w-0">
            {activeSection === 'leads' && (
              <section id="authentication" className="space-y-4 pb-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Key className="size-4 text-foreground" />
                  <h2 className="text-base font-bold text-foreground">Authentication</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">Generate your API key from <strong className="text-foreground">Dashboard → Settings → API Keys</strong> and pass it as a Bearer token.</p>
                <CodeBlock code={'Authorization: Bearer klinq_live_xxxxxxxxxxxxxxxxxxxx'} language="http" />
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { code: '200', label: 'OK',          bg: 'border-emerald-500/20 bg-emerald-500/5', fg: 'text-emerald-600 dark:text-emerald-400' },
                    { code: '401', label: 'Unauthorized', bg: 'border-red-500/20 bg-red-500/5',         fg: 'text-red-600 dark:text-red-400' },
                    { code: '500', label: 'Server Error', bg: 'border-amber-500/20 bg-amber-500/5',     fg: 'text-amber-600 dark:text-amber-400' },
                  ].map(s => (
                    <div key={s.code} className={`rounded-lg border px-4 py-3 ${s.bg}`}>
                      <p className={`text-sm font-bold font-mono ${s.fg}`}>{s.code}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => { const Icon = current.icon; return <Icon className={`size-4 ${current.color}`} /> })()}
                <h2 className="text-base font-bold text-foreground">{current.label}</h2>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">{current.endpoints.length} endpoints</span>
              </div>
              <div className="space-y-3">
                {current.endpoints.map(ep => <EndpointCard key={ep.id} ep={ep} />)}
              </div>
            </section>

            <div className="rounded-xl border border-border bg-muted/20 p-5 flex gap-4 items-start">
              <Shield className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Rate Limiting</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Limited to <strong className="text-foreground">100 requests/minute</strong> per API key. Exceeding returns <code className="bg-muted px-1 rounded text-[10px]">429 Too Many Requests</code>.</p>
              </div>
            </div>

            <div className="bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-1">
                <BookOpen className="size-4 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold tracking-tight text-white">Need a custom integration?</h3>
                <p className="text-xs text-zinc-400">Our team can help you build webhook flows, Zapier integrations, and custom middleware.</p>
              </div>
              <Button asChild className="h-9 px-6 text-xs font-bold bg-white text-zinc-900 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer">
                <Link href="/contact" className="inline-flex items-center gap-1.5">Talk to an Engineer <ArrowRight className="size-3.5" /></Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
