import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'OrbitCRM — Voice-First CRM for Indian Sales Teams',
    template: '%s | OrbitCRM'
  },
  description: "India's first voice-native CRM. Record conversations in Hindi or English, let AI extract leads, update your pipeline hands-free — built for field sales teams.",
  keywords: ['CRM India', 'OrbitCRM', 'Voice CRM', 'Sales CRM Hindi', 'WhatsApp CRM', 'Lead Management India', 'Field Sales CRM'],
  authors: [{ name: 'OrbitCRM' }],
  creator: 'OrbitCRM',
  metadataBase: new URL('https://orbitcrm.in'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://orbitcrm.in',
    siteName: 'OrbitCRM',
    title: 'OrbitCRM — Stop Typing. Start Talking.',
    description: "India's first AI-powered voice CRM. Capture leads, track conversations, and close deals — all in Hindi, English, or Hinglish.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'OrbitCRM' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OrbitCRM — Voice-First Sales Intelligence',
    description: "India's #1 voice-native CRM for modern sales teams.",
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
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
