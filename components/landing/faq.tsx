"use client"
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'How does voice-to-CRM work?',
    a: 'Record your sales conversation using our app or web interface. Our AI transcribes audio in real-time, extracts key information like names, phones, budgets, and follow-up dates, then creates or updates the lead record. Works with Hindi, English, Hinglish, and 10+ other languages.',
  },
  {
    q: 'Is my data secure?',
    a: 'We use AES-256 encryption for all data at rest and in transit. Servers are hosted in India for data localization compliance. We follow strict security practices and conduct regular third-party security audits.',
  },
  {
    q: 'Can I import my existing leads?',
    a: 'Yes — we support bulk import from Excel, CSV, and direct migration from Salesforce, HubSpot, and Zoho. Our team will help migrate data for free during onboarding.',
  },
  {
    q: 'What languages are supported?',
    a: 'Hindi, English, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi and more. Our AI also handles code-switching — the natural language mixing common in Indian business conversations.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes, native iOS and Android apps with full offline support. Record voice notes, update leads, and plan routes without internet. Data syncs automatically when back online.',
  },
  {
    q: 'What support options are available?',
    a: 'All plans include email support (24hr response). Professional plans get priority support (4hr). Enterprise includes 24/7 phone support and a dedicated account manager.',
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 bg-background border-t border-border/60">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-6">
            FAQ
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto max-w-2xl space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                id={`faq-q-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                aria-controls={`faq-a-${i}`}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/10 transition-colors"
              >
                <span className="font-semibold text-foreground text-sm">{faq.q}</span>
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open === i ? 'rotate-180 text-foreground' : ''}`} />
              </button>
              <div
                id={`faq-a-${i}`}
                role="region"
                aria-labelledby={`faq-q-${i}`}
                className={`grid transition-all duration-200 ${open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
