import { Clock, FileText, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — Klinq CRM',
  description: 'Review the Terms of Service governing the use of Klinq CRM multi-tenant platform and service commitments.',
}

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-3xl space-y-12">
      
      {/* Title Header */}
      <div className="space-y-4 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="size-4.5" />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">Legal Agreement</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display">
          Terms of Service
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Clock className="size-3.5" />
          <span>Last updated: May 2026</span>
        </div>
      </div>

      {/* Real Terms Content */}
      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">1. Acceptance of Terms</h2>
          <p>
            By using and logging into Klinq CRM, you and the company you represent agree to be bound by these terms. If you do not agree, you must terminate your workspace instance and cease access immediately.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">2. Service Description</h2>
          <p>
            Klinq CRM is a multi-tenant CRM platform. Access is invite-only, and companies are manually vetted and onboarded by the Klinq CRM team. We reserve the right to limit access or reject company registration requests to prevent abuse.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">3. Account Responsibilities</h2>
          <p>
            When utilizing your CRM credentials:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must keep credentials secure and confidential.</li>
            <li>You must not share individual accounts among multiple agents.</li>
            <li>You are responsible for all data mutations, leads created, and messages sent under your login session.</li>
            <li>You must notify us immediately of any unauthorized access or breach of security.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">4. Acceptable Use</h2>
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/15 flex gap-3">
            <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-destructive">Prohibited Activities</p>
              <p className="text-muted-foreground">
                You may NOT use Klinq CRM to send spam/unsolicited WhatsApp or SMS messages, store illegal materials, attempt to bypass RLS policies to access other companies' isolated data, or reverse engineer the platform.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">5. Data Ownership</h2>
          <p>
            You own all raw lead lists, notes, customer records, and interaction logs uploaded to your isolated database schema. We make no claims of ownership over your CRM data, and you can export or delete your dataset at any time.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">6. Uptime and Support</h2>
          <p>
            We aim to maintain a 99% uptime for core database transactions and API routing. Active customer support is available via email at <a href="mailto:klinqcrm@gmail.com" className="text-foreground hover:underline font-semibold">klinqcrm@gmail.com</a>. We reply to all critical support tickets within 24 hours on business days.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">7. Pricing and Billing</h2>
          <p>
            Plan pricing, GST billing terms, and payment schedules are mutually agreed upon during corporate onboarding. Any price modifications will be communicated at least 30 days in advance. No refunds are issued for partial billing cycles.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">8. Termination</h2>
          <p>
            We reserve the right to suspend or delete workspace instances violating Acceptable Use terms. You can cancel your subscription at any time. Cancelled data will be held for 30 days to facilitate final exports before complete database deletion.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">9. Limitation of Liability</h2>
          <p>
            Klinq CRM, its creators, and partners shall not be held liable for any indirect, incidental, special, or consequential damages resulting from database downtime, message dispatch failures, or loss of sales data.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">10. Governing Law</h2>
          <p>
            These terms, access rules, and service agreements are governed by the laws of India. Any legal dispute or claims shall be resolved under the jurisdiction of courts in Rajkot, Gujarat.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground font-display">11. Contact</h2>
          <p>
            For legal inquiries or terms clarification, contact our administration at{' '}
            <a href="mailto:klinqcrm@gmail.com" className="text-foreground hover:underline font-bold">
              klinqcrm@gmail.com
            </a>.
          </p>
        </section>

      </div>

    </div>
  )
}
