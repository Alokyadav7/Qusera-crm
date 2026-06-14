import { Shield, Clock, FileText } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — Klinq CRM',
  description: 'Understand how Klinq CRM collects, isolates, and protects your corporate data and customer interactions.',
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-3xl space-y-12">
      
      {/* Title Header */}
      <div className="space-y-4 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="size-4.5" />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">Legal Agreement</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display">
          Privacy Policy
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Clock className="size-3.5" />
          <span>Last updated: May 2026</span>
        </div>
        
      </div>

      {/* Real Policy Content */}
      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">1. Introduction</h2>
          <p>
            Klinq CRM (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the Klinq CRM software platform. This privacy policy explains how we collect, use, and protect your information when your company registers an instance or uses our services.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">2. Information We Collect</h2>
          <p>
            To provide our multi-tenant CRM service, we collect and process the following information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account information:</strong> User profiles (name, work email, organization details, profile picture).</li>
            <li><strong>Usage data:</strong> Technical logs of dashboard pages visited, actions performed, active features, session times, and interaction logs.</li>
            <li><strong>Communication data:</strong> Records of WhatsApp messages, SMS notifications, and emails composed or dispatched through our integrated communications API and gateways.</li>
            <li><strong>Device and browser information:</strong> IP addresses, browser types, operating systems, and viewport specifications for system diagnostics.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">3. How We Use Your Information</h2>
          <p>
            We process your information based on performance of contract and legitimate interest:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To operate, provision, and continuously improve the CRM modules and features.</li>
            <li>To send critical transaction notifications, password resets, onboarding emails, and collaborator invitations.</li>
            <li>To resolve support requests and diagnose system errors.</li>
            <li><strong>Data Integrity:</strong> We do NOT sell, rent, or trade your corporate CRM database or user data to third-party advertisers.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">4. Data Storage</h2>
          <p>
            All application data is securely hosted and stored in Postgres databases managed by <strong>Supabase</strong> (on AWS infrastructures). Databases are provisioned in the secure cloud region closest to our service cluster, with all active databases encrypted both at rest (AES-256) and in transit (SSL/TLS).
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">5. Data Isolation</h2>
          <div className="p-4 rounded-lg bg-muted/40 border border-border flex gap-3">
            <Shield className="size-4 shrink-0 text-foreground mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground">Strict Tenant Separation</p>
              <p>
                Each registered company instance's tables are isolated via row-level security (RLS) policies. Klinq CRM staff cannot access your leads, tasks, or chats without explicit diagnostic impersonation access.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">6. Third Party Services</h2>
          <p>
            We leverage leading technology subprocessors to operate the CRM platform:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase:</strong> Core relational database infrastructure and auth services.</li>
            <li><strong>Gmail / Resend:</strong> Email transmission gateways.</li>
            <li><strong>Meta:</strong> Developer host for WhatsApp Business Cloud API connections.</li>
            <li><strong>Fast2SMS:</strong> Primary Indian carrier SMS transmission.</li>
            <li><strong>Vercel:</strong> Front-end hosting and serverless deployments.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">7. Your Rights</h2>
          <p>
            Under Indian IT acts and general data guidelines, you have the right to request a complete CSV/JSON export of your organization's database tables, request deletion of specific team member records or client logs, or request complete account erasure by contacting our administrator.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">8. Cookies</h2>
          <p>
            We use strictly essential technical session cookies to persist login states and security context. We do not place marketing, analytics, or behavioral advertisement cookies on your machine.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">9. Contact</h2>
          <p>
            For any queries or assistance regarding your data privacy, contact our support team at{' '}
            <a href="mailto:klinqcrm@gmail.com" className="text-foreground hover:underline font-bold">
              klinqcrm@gmail.com
            </a>.
          </p>
        </section>

      </div>

    </div>
  )
}
