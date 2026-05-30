import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { CompanyProvider } from '@/lib/company-context'

export const metadata: Metadata = {
  title: {
    default: 'KlinqCRM — Smart CRM for Indian Sales Teams',
    template: '%s | KlinqCRM'
  },
  description: "KlinqCRM — The CRM built for growing Indian businesses. Manage leads, deals, WhatsApp, SMS, and Email conversations in one place.",
  keywords: ['CRM', 'KlinqCRM', 'Indian CRM', 'Sales CRM', 'Lead Management', 'WhatsApp CRM', 'Team CRM', 'klinqcrm.in'],
  authors: [{ name: 'KlinqCRM Technologies Pvt. Ltd.' }],
  creator: 'KlinqCRM',
  metadataBase: new URL('https://klinqcrm.in'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://klinqcrm.in',
    siteName: 'KlinqCRM',
    title: 'KlinqCRM — The CRM built for growing Indian businesses',
    description: 'Manage leads, close deals, and stay on top of every WhatsApp, SMS, and Email conversation — all in one place.',
    images: [{ url: '/Klinqcrm-logo.png', width: 920, height: 920, alt: 'KlinqCRM' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KlinqCRM',
    description: 'The CRM built for growing Indian businesses.',
    images: ['/Klinqcrm-logo.png']
  },
  icons: {
    icon: [
      { url: '/Klinqcrm-logo.png' }
    ],
    apple: '/Klinqcrm-logo.png'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <CompanyProvider>
            {children}
          </CompanyProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
