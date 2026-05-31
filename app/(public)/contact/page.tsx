import { ContactClient } from './contact-client'

export const metadata = {
  title: 'Book a Demo — Klinq CRM',
  description: "Schedule a demo session for Klinq CRM. We'll review your requirements and onboard your company within 24 hours.",
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
      <ContactClient />
    </div>
  )
}
