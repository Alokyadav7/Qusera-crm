"use client"

import { Navigation, Footer } from '@/components/landing-layout'
import { HeroSection } from '@/components/landing/hero'
import { FeaturesSection } from '@/components/landing/features'
import { HowItWorksSection } from '@/components/landing/how-it-works'
import { PricingSection } from '@/components/landing/pricing'
import { IntegrationsSection, CTASection } from '@/components/landing/cta'
import { FAQSection } from '@/components/landing/faq'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <IntegrationsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
