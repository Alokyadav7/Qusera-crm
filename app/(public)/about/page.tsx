import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquare, Zap, MapPin, Mail, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'About Us — Klinq CRM',
  description: 'Learn why we built Klinq CRM — the first voice and WhatsApp-native CRM designed specifically for Indian sales teams.',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 space-y-16 md:space-y-28 max-w-5xl">
      
      {/* SECTION 1 — HERO */}
      <section className="text-center space-y-6 max-w-3xl mx-auto py-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          Our Story
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1] font-display">
          Built for businesses that are serious about growth
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Klinq CRM was built because we couldn't find a CRM that worked the way Indian sales teams actually work — with WhatsApp, local languages, and the need for simplicity over complexity.
        </p>
      </section>

      {/* SECTION 2 — MISSION */}
      <section className="border-y border-border py-10 md:py-16 grid md:grid-cols-3 gap-6 md:gap-10 items-start">
        <div className="md:col-span-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Our Mission</h2>
        </div>
        <div className="md:col-span-2">
          <p className="text-lg md:text-xl font-bold text-foreground leading-relaxed tracking-tight">
            To give every Indian business — from a 5-person startup to a 500-person enterprise — the tools to manage their customers professionally and grow predictably.
          </p>
        </div>
      </section>

      {/* SECTION 3 — WHY WE BUILT THIS */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-display">Why We Built This</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Traditional CRMs fail in the Indian landscape. Here is how we differ.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: MessageSquare,
              title: 'WhatsApp is how India does business',
              desc: 'Most CRMs treat WhatsApp as an afterthought. We built WhatsApp into the core of Klinq, allowing native chat tracking directly inside lead pipelines.'
            },
            {
              icon: Zap,
              title: 'Simplicity over complexity',
              desc: 'Enterprise CRMs are built for enterprises. Klinq is built for teams that need to move fast, call leads, record interactions, and close deals without a 6-month implementation cycle.'
            },
            {
              icon: MapPin,
              title: 'Local context matters',
              desc: 'Designed natively for the Indian market with support for INR currency, Indian timezones, GSTIN on invoices, local languages, and Fast2SMS integration.'
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-6 space-y-4 hover:border-foreground/20 transition-colors">
              <div className="size-9 rounded bg-muted/60 border border-border flex items-center justify-center text-foreground">
                <item.icon className="size-4.5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — CONTACT */}
      <section className="bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 rounded-2xl p-8 md:p-12 text-center text-zinc-100 space-y-6">
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">Want to learn more?</h2>
          <p className="text-xs text-zinc-400">
            Reach out directly or book an onboarding session with our product specialist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-zinc-400 py-2">
          <a href="mailto:klinqcrm@gmail.com" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <Mail className="size-4 text-emerald-400" />
            <span>klinqcrm@gmail.com</span>
          </a>
          <a href="https://wa.me/918603058090" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
            <MessageSquare className="size-4 text-emerald-400" />
            <span>WhatsApp: 8603058090</span>
          </a>
        </div>

        <div className="pt-2">
          <Button asChild className="h-10 px-6 text-xs font-bold bg-white text-zinc-900 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
            <Link href="/contact" className="inline-flex items-center gap-1.5">
              <span>Book a Demo</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </section>

    </div>
  )
}
