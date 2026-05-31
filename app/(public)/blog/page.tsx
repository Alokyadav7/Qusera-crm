import { BlogClient } from './blog-client'

export const metadata = {
  title: 'Blog — Klinq CRM',
  description: 'Tips, guides, and insights for sales teams and CRM users. Stay tuned for our upcoming publications.',
}

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 space-y-10 max-w-4xl">
      
      {/* SECTION 1 — HEADER */}
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          Publications
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
          Klinq Blog
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tips, guides, and insights for sales teams and CRM users.
        </p>
      </section>

      {/* Subscribe Form and Coming Soon State */}
      <BlogClient />

    </div>
  )
}
