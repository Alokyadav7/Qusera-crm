"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PublicNavbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 w-full bg-background transition-all duration-200 ${scrolled ? 'border-b border-border' : 'border-b border-transparent'}`}>
      <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/Klinqcrm-logo.png"
            alt="Klinq CRM"
            className="h-8 w-auto object-contain dark:brightness-110"
            onError={(e) => {
              // fallback to text if image fails to load
              e.currentTarget.style.display = 'none'
              const textNode = e.currentTarget.nextSibling as HTMLElement
              if (textNode) textNode.style.display = 'block'
            }}
          />
          <span className="hidden font-display text-base font-extrabold tracking-tight text-foreground" style={{ display: 'none' }}>
            Klinq<span className="text-emerald-500 font-semibold">CRM</span>
          </span>
        </Link>

        {/* Center: Nav links */}
        <nav className="hidden lg:flex items-center gap-6">
          {[
            { label: 'Features', href: '/#features' },
            { label: 'Pricing', href: '/#pricing' },
            { label: 'About', href: '/about' },
            { label: 'API Docs', href: '/api-docs' },
            { label: 'Contact', href: '/contact' },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
          )}
          <Button variant="ghost" asChild className="h-8 px-3 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="h-8 px-4 text-xs font-semibold rounded bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-all shadow-sm cursor-pointer">
            <Link href="/contact">Book a Demo</Link>
          </Button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-14 bottom-0 bg-background z-40 border-t border-border flex flex-col p-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-1">
            {[
              { label: 'Features', href: '/#features' },
              { label: 'Pricing', href: '/#pricing' },
              { label: 'About', href: '/about' },
              { label: 'API Docs', href: '/api-docs' },
              { label: 'Careers', href: '/careers' },
              { label: 'Blog', href: '/blog' },
              { label: 'Contact', href: '/contact' },
            ].map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="px-3 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border">
              <Button variant="outline" asChild className="w-full rounded h-10 text-xs font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
              </Button>
              <Button asChild className="w-full rounded h-10 text-xs font-semibold bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Book a Demo</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
