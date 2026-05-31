import { HeroSection } from '@/components/landing/hero'
import { FeaturesSection } from '@/components/landing/features'
import { HowItWorksSection } from '@/components/landing/how-it-works'
import { PricingSection } from '@/components/landing/pricing'
import { IntegrationsSection, CTASection } from '@/components/landing/cta'
import { FAQSection } from '@/components/landing/faq'

export const metadata = {
  title: 'Klinq CRM — The CRM built for Indian businesses',
  description: 'Manage leads, close deals, and stay on top of every WhatsApp, SMS, and Email conversation. Built for growing Indian businesses.',
}

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <IntegrationsSection />
      <FAQSection />
      <CTASection />
    </>
  )
}
