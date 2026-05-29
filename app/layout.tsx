import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { CompanyProvider } from '@/lib/company-context'

export const metadata: Metadata = {
  title: {
    default: 'Klinq CRM — Smart CRM for Sales Teams',
    template: '%s | Klinq CRM'
  },
  description: "Klinq CRM — The intelligent multi-tenant CRM platform for modern sales teams. Manage leads, deals, team, and integrations in one place.",
  keywords: ['CRM', 'Klinq CRM', 'Sales CRM', 'Lead Management', 'WhatsApp CRM', 'Team CRM'],
  authors: [{ name: 'Klinq CRM' }],
  creator: 'Klinq CRM',
  metadataBase: new URL('https://klinq.app'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://klinq.app',
    siteName: 'Klinq CRM',
    title: 'Klinq CRM — Smart CRM for Modern Teams',
    description: 'Manage your entire sales pipeline, team, and customer communication from one platform.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Klinq CRM' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klinq CRM',
    description: 'Smart CRM for modern sales teams.',
    images: ['/og-image.png']
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-icon.png'
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
