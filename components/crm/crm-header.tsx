'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Search, Bell, Plus, Mic, Languages, X, User, CheckSquare, Loader2, Building2, Phone, Sun, Moon, BellOff, ExternalLink, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { formatDistanceToNow as _fmtDist } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface CRMHeaderProps {
  title: string
  subtitle?: string
}

interface SearchResult {
  id: string
  type: 'lead' | 'task'
  title: string
  subtitle: string
  href: string
}

// ── Global Search ──────────────────────────────────────────────────────────────
function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const supabase = createClient()

    const [leadsRes, tasksRes] = await Promise.all([
      (supabase as any)
        .from('leads')
        .select('id, full_name, company, phone_number, status')
        .or(`full_name.ilike.%${q}%,company.ilike.%${q}%,phone_number.ilike.%${q}%`)
        .limit(6),
      (supabase as any)
        .from('tasks')
        .select('id, title, task_type, due_date, is_completed')
        .ilike('title', `%${q}%`)
        .eq('is_completed', false)
        .limit(4),
    ])

    const leadResults: SearchResult[] = ((leadsRes.data || []) as any[]).map(l => ({
      id: l.id,
      type: 'lead',
      title: l.full_name,
      subtitle: [l.company, l.phone_number, l.status].filter(Boolean).join(' · '),
      href: '/dashboard/leads',
    }))

    const taskResults: SearchResult[] = ((tasksRes.data || []) as any[]).map(t => ({
      id: t.id,
      type: 'task',
      title: t.title,
      subtitle: `${t.task_type} · due ${formatDistanceToNow(new Date(t.due_date), { addSuffix: true })}`,
      href: '/dashboard/tasks',
    }))

    setResults([...leadResults, ...taskResults])
    setSearching(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
  }, [query, search])

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <>
      <div
        className="hidden md:flex items-center gap-2 max-w-sm flex-1 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <div className="pl-8 h-9 w-full flex items-center border border-input rounded-md bg-transparent text-sm text-muted-foreground select-none px-3">
            Search leads, tasks… (Ctrl+K)
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden" aria-describedby={undefined}>
          <div className="flex items-center border-b px-3">
            <Search className="size-4 text-muted-foreground shrink-0 mr-2" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search leads, tasks… (Hindi/English supported)"
              className="border-0 shadow-none focus-visible:ring-0 h-12 text-base"
              autoFocus
            />
            {searching && <Loader2 className="size-4 animate-spin text-muted-foreground mr-2" />}
            {query && (
              <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setQuery('')}>
                <X className="size-3" />
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {!query && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Search className="size-8 mx-auto mb-2 opacity-30" />
                <p>Start typing to search your CRM</p>
                <p className="text-xs mt-1">Searches leads by name, company, phone · tasks by title</p>
              </div>
            )}

            {query && results.length === 0 && !searching && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No results for <strong>"{query}"</strong>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.filter(r => r.type === 'lead').length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <User className="size-3" /> Leads
                    </div>
                    {results.filter(r => r.type === 'lead').map(r => (
                      <button
                        key={r.id}
                        className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleSelect(r.href)}
                      >
                        <div className="size-8 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="size-4 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results.filter(r => r.type === 'task').length > 0 && (
                  <div>
                    {results.filter(r => r.type === 'lead').length > 0 && (
                      <div className="mx-3 my-1 border-t" />
                    )}
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <CheckSquare className="size-3" /> Tasks
                    </div>
                    {results.filter(r => r.type === 'task').map(r => (
                      <button
                        key={r.id}
                        className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleSelect(r.href)}
                      >
                        <div className="size-8 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckSquare className="size-4 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t px-3 py-2 flex items-center gap-3 text-xs text-muted-foreground bg-muted/20">
            <span>↵ to select</span>
            <span>esc to close</span>
            <span className="ml-auto">Ctrl+K to open</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Live Notification Bell (Realtime) ─────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const router = useRouter()
  const dropRef = useRef<HTMLDivElement>(null)

  // Load company_id once
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('user_active_company').select('company_id')
        .eq('user_id', user.id).single()
        .then(({ data }) => setCompanyId((data as any)?.company_id ?? null))
    })
  }, [])

  const { notifications, unread, loading, markRead, markAllRead } = useNotifications(companyId)
  const recent = notifications.slice(0, 10)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function entityHref(n: typeof notifications[0]) {
    if (n.entity_type === 'lead') return n.entity_id ? `/dashboard/leads/${n.entity_id}` : `/dashboard/leads`
    if (n.entity_type === 'task') return `/dashboard/tasks`
    if (n.entity_type === 'deal') return `/dashboard/deals`
    if (n.entity_type === 'message') return `/dashboard/whatsapp`
    return `/dashboard/notifications`
  }

  return (
    <div className="relative" ref={dropRef}>
      <Button
        id="notification-bell-btn"
        variant="outline"
        size="icon"
        className="size-9 relative"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-white border-0 animate-pulse">
            {unread > 9 ? '9+' : unread}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 w-80 z-50 rounded-xl border border-border shadow-2xl bg-popover text-popover-foreground overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1.5">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors"
                >
                  <CheckCheck className="size-3" /> Mark all read
                </button>
              )}
              <button onClick={() => { setOpen(false); router.push('/dashboard/notifications') }}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors flex items-center gap-1">
                <ExternalLink className="size-3" /> All
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && recent.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <BellOff className="size-8 mb-2 opacity-30" />
                <p className="text-xs">No notifications yet</p>
              </div>
            )}
            {!loading && recent.map(n => (
              <button
                key={n.id}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}
                onClick={() => { markRead(n.id); setOpen(false); router.push(entityHref(n)) }}
              >
                <span className={`mt-1 size-2 rounded-full shrink-0 ${!n.read ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-foreground">{n.title}</p>
                  {n.body && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {_fmtDist(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Quick Add Modal ────────────────────────────────────────────────────────────
function QuickAddMenu() {
  const [type, setType] = useState<'lead' | 'task' | null>(null)
  const [saving, setSaving] = useState(false)
  const [leadForm, setLeadForm] = useState({ full_name: '', phone_number: '', company: '' })
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', priority: 'medium' })
  const router = useRouter()

  const saveLead = async () => {
    if (!leadForm.full_name) { toast.error('Name is required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await (supabase as any).from('leads').insert({
      user_id: user.id,
      full_name: leadForm.full_name,
      phone_number: leadForm.phone_number || null,
      company: leadForm.company || null,
      status: 'new',
      buying_intent: 'medium',
      sentiment_score: 0,
      gst_status: 'pending',
      pan_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(`Lead "${leadForm.full_name}" added! ✅`)
    setLeadForm({ full_name: '', phone_number: '', company: '' })
    setType(null)
    setSaving(false)
    router.refresh()
  }

  const saveTask = async () => {
    if (!taskForm.title || !taskForm.due_date) { toast.error('Title and due date required'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await (supabase as any).from('tasks').insert({
      user_id: user.id,
      title: taskForm.title,
      due_date: taskForm.due_date,
      priority: taskForm.priority,
      task_type: 'other',
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Task created! ✅')
    setTaskForm({ title: '', due_date: '', priority: 'medium' })
    setType(null)
    setSaving(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Create New</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setType('lead')}>
            <User className="size-4 mr-2 text-foreground" />New Lead
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setType('task')}>
            <CheckSquare className="size-4 mr-2 text-foreground" />New Task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/dashboard/voice')}>
            <Mic className="size-4 mr-2 text-foreground" />Voice Note → CRM
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Lead Dialog */}
      <Dialog open={type === 'lead'} onOpenChange={o => !o && setType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <User className="size-4 text-foreground" />
              </div>
              Quick Add Lead
            </DialogTitle>
            <DialogDescription>Add a lead in seconds. Fill in more details on the Leads page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rajesh Mehta" value={leadForm.full_name}
                  onChange={e => setLeadForm(p => ({ ...p, full_name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveLead()} autoFocus />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="+91 98765 43210" value={leadForm.phone_number}
                    onChange={e => setLeadForm(p => ({ ...p, phone_number: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="TechCorp" value={leadForm.company}
                    onChange={e => setLeadForm(p => ({ ...p, company: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setType(null)}>Cancel</Button>
            <Button onClick={saveLead} disabled={saving || !leadForm.full_name}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={type === 'task'} onOpenChange={o => !o && setType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <CheckSquare className="size-4 text-foreground" />
              </div>
              Quick Add Task
            </DialogTitle>
            <DialogDescription>Create a task quickly. Set lead association on the Tasks page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Task Title <span className="text-destructive">*</span></Label>
              <Input placeholder="Call Rajesh about proposal" value={taskForm.title}
                onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={taskForm.due_date}
                  onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={taskForm.priority}
                  onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                >
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setType(null)}>Cancel</Button>
            <Button onClick={saveTask} disabled={saving || !taskForm.title || !taskForm.due_date}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Dark Mode Toggle ───────────────────────────────────────────────────────────
function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return (
    <Button variant="outline" size="icon" className="size-9">
      <Sun className="size-4" />
    </Button>
  )

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-9"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

// ── Language Selector ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'gu', label: 'Gujarati (ગુજরાતી)' },
]

function LanguageSelector() {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    const stored = localStorage.getItem('crm_lang')
    if (stored) setLang(stored)
  }, [])

  const selectLang = (code: string, label: string) => {
    setLang(code)
    localStorage.setItem('crm_lang', code)
    document.documentElement.lang = code
    toast.success(`Language set to ${label}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="size-9">
          <Languages className="size-4" />
          <span className="sr-only">Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Interface Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map(l => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => selectLang(l.code, l.label)}
            className={lang === l.code ? 'bg-foreground/10 text-foreground font-medium' : ''}
          >
            {lang === l.code && '✓ '}{l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Main Header ────────────────────────────────────────────────────────────────
export function CRMHeader({ title, subtitle }: CRMHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border/50 glass-ultra px-4 md:px-6 shadow-sm shadow-foreground/5 transition-all">
      <SidebarTrigger className="-ml-2 hover:bg-muted/50 rounded-lg" />

      <div className="flex-1 min-w-0">
        <h1 className="text-base md:text-lg font-bold tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground font-medium truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      <GlobalSearch />

      <div className="flex items-center gap-2">
        <DarkModeToggle />
        <LanguageSelector />
        <NotificationBell />
        <div className="hidden sm:block w-px h-6 bg-border/50 mx-1" />
        <QuickAddMenu />
      </div>
    </header>
  )
}
