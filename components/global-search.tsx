'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, User, Briefcase, Building2, FileText, X, Loader2, ArrowRight, Command } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  type: 'lead' | 'deal' | 'contact' | 'company'
  title: string
  subtitle: string
  href: string
}

// ─── Search result row ────────────────────────────────────────────────────────

const ICONS: Record<SearchResult['type'], React.ElementType> = {
  lead: User,
  deal: Briefcase,
  contact: FileText,
  company: Building2,
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  lead: 'Lead',
  deal: 'Deal',
  contact: 'Contact',
  company: 'Company',
}

const TYPE_COLORS: Record<SearchResult['type'], string> = {
  lead: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  deal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  contact: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  company: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
}

function ResultRow({ result, active, onClick }: { result: SearchResult; active: boolean; onClick: () => void }) {
  const Icon = ICONS[result.type]
  const colorCls = TYPE_COLORS[result.type]

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      }`}
    >
      <div className={`size-8 rounded-lg border flex items-center justify-center shrink-0 ${colorCls}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{result.title}</p>
        <p className="text-xs text-zinc-500 truncate">{result.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 ${colorCls}`}>
          {TYPE_LABELS[result.type]}
        </span>
        {active && <ArrowRight className="size-3 text-zinc-500" />}
      </div>
    </button>
  )
}

// ─── Main command palette ─────────────────────────────────────────────────────

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Keyboard shortcut: CMD+K / CTRL+K ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // ── Debounced search ─────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const term = `%${q}%`

      const [leads, deals, contacts] = await Promise.all([
        (supabase as any).from('leads').select('id, full_name, phone, email, status').ilike('full_name', term).limit(5),
        (supabase as any).from('deals').select('id, title, stage, deal_value').ilike('title', term).limit(5),
        (supabase as any).from('contacts').select('id, full_name, email, phone').ilike('full_name', term).limit(5),
      ])

      const mapped: SearchResult[] = [
        ...((leads.data ?? []) as any[]).map(l => ({
          id: l.id, type: 'lead' as const,
          title: l.full_name ?? 'Unnamed Lead',
          subtitle: l.email ?? l.phone ?? l.status ?? '',
          href: `/dashboard/leads/${l.id}`,
        })),
        ...((deals.data ?? []) as any[]).map(d => ({
          id: d.id, type: 'deal' as const,
          title: d.title ?? 'Unnamed Deal',
          subtitle: `${d.stage ?? 'unknown'} · ₹${(d.deal_value ?? 0).toLocaleString('en-IN')}`,
          href: `/dashboard/deals/${d.id}`,
        })),
        ...((contacts.data ?? []) as any[]).map(c => ({
          id: c.id, type: 'contact' as const,
          title: c.full_name ?? 'Unnamed Contact',
          subtitle: c.email ?? c.phone ?? '',
          href: `/dashboard/contacts/${c.id}`,
        })),
      ]

      setResults(mapped)
      setActiveIdx(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // ── Keyboard navigation ──────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIdx]) {
      router.push(results[activeIdx].href)
      setOpen(false)
    }
  }

  const handleSelect = (result: SearchResult) => {
    router.push(result.href)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
          {loading
            ? <Loader2 className="size-4 text-zinc-500 shrink-0 animate-spin" />
            : <Search className="size-4 text-zinc-500 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            placeholder="Search leads, deals, contacts…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-zinc-400 cursor-pointer">
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 rounded">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-1">
              {results.map((r, i) => (
                <ResultRow
                  key={r.id}
                  result={r}
                  active={i === activeIdx}
                  onClick={() => handleSelect(r)}
                />
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="px-4 py-10 text-center">
              <Search className="size-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No results for "{query}"</p>
              <p className="text-xs text-zinc-600 mt-1">Try searching by name, email, or phone</p>
            </div>
          ) : query.length === 0 ? (
            <div className="px-4 py-6">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'New Lead', href: '/dashboard/leads?new=1', icon: User, color: 'text-violet-400' },
                  { label: 'New Deal', href: '/dashboard/deals?new=1', icon: Briefcase, color: 'text-emerald-400' },
                  { label: 'New Contact', href: '/dashboard/contacts?new=1', icon: FileText, color: 'text-blue-400' },
                  { label: 'WhatsApp', href: '/dashboard/whatsapp', icon: Building2, color: 'text-green-400' },
                ].map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      onClick={() => { router.push(item.href); setOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left transition-colors cursor-pointer group"
                    >
                      <Icon className={`size-4 ${item.color}`} />
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-zinc-800/60 flex items-center gap-4 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1"><kbd className="font-medium">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="font-medium">Enter</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="font-medium">Esc</kbd> close</span>
          <span className="ml-auto flex items-center gap-1">
            <Command className="size-3" /> K to open
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Trigger button (for nav bar) ─────────────────────────────────────────────

export function SearchTriggerButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') setOpen(v => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Sync with GlobalSearch's state via window event
  const handleClick = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-all text-xs cursor-pointer"
      id="global-search-trigger"
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-medium bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5">
        <Command className="size-2.5" />K
      </kbd>
    </button>
  )
}
