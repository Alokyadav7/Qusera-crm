import { Briefcase, ArrowRight, Code, DollarSign, Globe, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Careers — Klinq CRM',
  description: 'Join the team building Klinq CRM. We are hiring Full Stack Developers and Sales professionals in India.',
}

export default function CareersPage() {
  const openRoles = [
    {
      title: 'Full Stack Developer',
      department: 'Engineering',
      type: 'Full-time',
      location: 'Remote / Rajkot',
      desc: 'Build and ship core features for Klinq CRM. Take ownership of front-to-back Next.js modules, Supabase integration, and real-time WhatsApp automation workflows.',
      subject: 'Application: Full Stack Developer'
    },
    {
      title: 'Sales & Business Development',
      department: 'Sales',
      type: 'Full-time',
      location: 'Rajkot',
      desc: 'Help onboard, support, and grow our corporate tenant base across India. Engage with company executives and design customized CRM rollout plans.',
      subject: 'Application: Sales & Business Development'
    }
  ]

  const values = [
    { title: 'Real ownership', desc: 'You ship features that real businesses and sales agents depend on daily. No hand-holding, maximum trust.' },
    { title: 'Small team', desc: 'No complex bureaucracy or endless alignment meetings. We design, write code, build solutions, and deploy.' },
    { title: 'Remote friendly', desc: 'Collaborate with the Rajkot office while enjoying the freedom to work from anywhere in India.' },
    { title: 'Growing fast', desc: 'Be part of the early core. Your contribution dictates our platform roadmap and architecture scaling.' }
  ]

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 space-y-16 md:space-y-24 max-w-5xl">
      
      {/* SECTION 1 — HERO */}
      <section className="text-center space-y-6 max-w-3xl mx-auto py-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          We're Hiring
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1] font-display">
          Build the CRM that powers Indian businesses
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          We're a small, focused team building something meaningful. If you care about craft and want real ownership, we want to hear from you.
        </p>
      </section>

      {/* SECTION 2 — OPEN ROLES */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
            <Briefcase className="size-4.5 text-muted-foreground" />
            <span>Open Positions</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Current active listings. Click apply to send your details directly.
          </p>
        </div>

        <div className="space-y-4">
          {openRoles.map((role, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-6 hover:border-foreground/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">{role.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-mono">
                    <span>{role.department}</span>
                    <span className="size-1 rounded-full bg-border" />
                    <span>{role.type}</span>
                    <span className="size-1 rounded-full bg-border" />
                    <span>{role.location}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{role.desc}</p>
              </div>
              <div className="shrink-0">
                <Button asChild className="w-full md:w-auto h-9 px-4 text-xs font-bold bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                  <a
                    href={`mailto:klinqcrm@gmail.com?subject=${encodeURIComponent(role.subject)}`}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 — WHY KLINQ */}
      <section className="space-y-8 border-t border-border pt-12 md:pt-16">
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
            <Star className="size-4.5 text-muted-foreground" />
            <span>Why Join Klinq?</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Our cultural values and work principles.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {values.map((v, idx) => (
            <div key={idx} className="p-5 rounded-xl border border-border bg-card/40 space-y-2">
              <h3 className="text-xs font-bold text-foreground">{v.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
