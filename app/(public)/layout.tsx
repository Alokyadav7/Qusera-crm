import { PublicNavbar } from '@/components/public/public-navbar'
import { Footer } from '@/components/landing-layout'

export default function PublicPagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicNavbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
