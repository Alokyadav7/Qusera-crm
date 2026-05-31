'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from 'next-themes'
import { Sun, Moon, Menu, X, ChevronDown, Zap } from 'lucide-react'

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-200 ${scrolled
        ? 'bg-background/90 backdrop-blur-md border-b border-border'
        : 'bg-transparent'
      }`}>
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group z-10">
          <img
            src="/Klinqcrm-logo.png"
            alt="KlinqCRM Logo"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/#features" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/#pricing" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/#integrations" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Integrations
          </Link>
          <Link href="/about" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/contact" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Contact
          </Link>
        </nav>

        {/* Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
          )}
          <Button variant="ghost" asChild className="h-8 px-3 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition-all">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="h-8 px-4 text-xs font-semibold rounded bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
            <Link href="/login">
              Request Access
            </Link>
          </Button>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          {mounted && (
            <Button variant="ghost" size="icon" className="size-8 rounded" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-8 rounded" onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container mx-auto flex flex-col gap-1 p-4">
            {[
              { label: 'Features', href: '/#features' },
              { label: 'Pricing', href: '/#pricing' },
              { label: 'Integrations', href: '/#integrations' },
              { label: 'About', href: '/about' },
              { label: 'Careers', href: '/careers' },
              { label: 'Blog', href: '/blog' },
              { label: 'Contact', href: '/contact' },
            ].map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
              <Button variant="outline" asChild className="w-full rounded h-9 text-xs font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
              </Button>
              <Button asChild className="w-full rounded h-9 text-xs font-semibold bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-all">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Request Access</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border py-10 sm:py-12 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <img
                src="/Klinqcrm-logo.png"
                alt="KlinqCRM Logo"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              India's first voice-native CRM for modern sales teams. Manage leads, track conversations, and close deals faster.
            </p>
            {/* Badges inline on mobile */}
            <div className="flex items-center gap-3 sm:hidden pt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Made in India
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-border px-1.5 py-0">
                SOC 2 Type II
              </Badge>
            </div>
          </div>

          {[
            {
              title: 'Product',
              links: [
                { label: 'Features', href: '/#features' },
                { label: 'Pricing', href: '/#pricing' },
                { label: 'Integrations', href: '/#integrations' },
              ]
            },
            {
              title: 'Company',
              links: [
                { label: 'About Us', href: '/about' },
                { label: 'Careers', href: '/careers' },
                { label: 'Blog', href: '/blog' },
                { label: 'Contact', href: '/contact' },
              ]
            },
            {
              title: 'Legal',
              links: [
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
              ]
            },
          ].map(col => (
            <div key={col.title} className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground">{col.title}</h4>
              <ul className="space-y-1.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="text-center sm:text-left space-y-0.5">
            <p className="font-medium">© 2026 Klinq CRM by Qusera. All rights reserved.</p>
            <p className="text-[10px] text-muted-foreground/50 font-mono tracking-wide">A product by Qusera Private Limited</p>
          </div>
          {/* Hidden on mobile — shown inside brand block */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Made in India
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-border px-1.5 py-0">
              SOC 2 Type II
            </Badge>
          </div>
        </div>
      </div>
    </footer>
  )
}
