'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { StickyNote, Plus, Trash2, CheckCheck, Loader2, Pin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Note {
  id: string
  content_raw: string
  created_at: string
  ai_extracted_data: { pinned?: boolean; color?: string } | null
}

const NOTE_COLORS = [
  { label: 'Default', value: 'default', bg: 'bg-card', border: 'border-border' },
  { label: 'Yellow',  value: 'yellow',  bg: 'bg-yellow-50 dark:bg-yellow-950/30',  border: 'border-yellow-200 dark:border-yellow-800' },
  { label: 'Blue',    value: 'blue',    bg: 'bg-blue-50 dark:bg-blue-950/30',       border: 'border-blue-200 dark:border-blue-800' },
  { label: 'Green',   value: 'green',   bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  { label: 'Red',     value: 'red',     bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-200 dark:border-red-800' },
]

function getColor(color?: string) {
  return NOTE_COLORS.find(c => c.value === color) || NOTE_COLORS[0]
}

export function PersonalNotesWidget() {
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')
  const [draftColor, setDraftColor] = useState('default')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Load notes + real-time subscription ──────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    const fetchNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('interactions')
        .select('id, content_raw, created_at, ai_extracted_data')
        .eq('type', 'text')
        .eq('direction', 'outbound')
        .is('lead_id', null)
        .order('created_at', { ascending: false })
        .limit(20)

      setNotes((data || []) as Note[])
      setLoading(false)
    }

    fetchNotes()

    // Real-time: auto-update when notes are added/deleted (even from another tab)
    const channel = supabase
      .channel('personal-notes-rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'interactions',
        filter: 'type=eq.text',
      }, () => { fetchNotes() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const addNote = async () => {
    if (!draft.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return }

    const { error } = await supabase.from('interactions').insert({
      user_id: user.id,
      lead_id: null,
      type: 'text',
      direction: 'outbound',
      content_raw: draft.trim(),
      ai_extracted_data: { pinned: false, color: draftColor },
      created_at: new Date().toISOString(),
    })

    if (error) {
      toast.error('Failed to save note: ' + error.message)
    } else {
      setDraft('')
      setDraftColor('default')
      setShowNew(false)
      toast.success('Note saved! 📝')
    }
    setAdding(false)
  }

  const deleteNote = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('interactions').delete().eq('id', id)
    if (error) toast.error('Delete failed')
    else setNotes(prev => prev.filter(n => n.id !== id))
    setDeletingId(null)
  }

  const togglePin = async (note: Note) => {
    const supabase = createClient()
    const pinned = !note.ai_extracted_data?.pinned
    await supabase.from('interactions').update({
      ai_extracted_data: { ...note.ai_extracted_data, pinned },
    }).eq('id', note.id)
    setNotes(prev => prev.map(n =>
      n.id === note.id ? { ...n, ai_extracted_data: { ...n.ai_extracted_data, pinned } } : n
    ))
  }

  // Sort pinned notes to top
  const sorted = [...notes].sort((a, b) => {
    const ap = a.ai_extracted_data?.pinned ? 1 : 0
    const bp = b.ai_extracted_data?.pinned ? 1 : 0
    return bp - ap
  })

  return (
    <Card className="glass-card border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <StickyNote className="size-3.5 text-amber-600" />
            </div>
            Personal Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{notes.length}</Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => { setShowNew(s => !s); setTimeout(() => textareaRef.current?.focus(), 50) }}
          >
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* New note composer */}
        {showNew && (
          <div className="space-y-2 p-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 animate-fade-in">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Write your note here… (Shift+Enter to save)"
              className="min-h-[80px] text-sm resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 p-0"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); addNote() }
                if (e.key === 'Escape') setShowNew(false)
              }}
            />
            <div className="flex items-center justify-between gap-2">
              {/* Color picker */}
              <div className="flex items-center gap-1">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => setDraftColor(c.value)}
                    className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${c.bg} ${
                      draftColor === c.value ? 'border-foreground scale-110' : 'border-border'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNew(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addNote}
                  disabled={!draft.trim() || adding}
                >
                  {adding ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes list */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <StickyNote className="size-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Quick thoughts, reminders, follow-ups</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sorted.map(note => {
              const color = getColor(note.ai_extracted_data?.color)
              const pinned = note.ai_extracted_data?.pinned
              return (
                <div
                  key={note.id}
                  className={`group relative p-3 rounded-lg border text-sm transition-all hover:shadow-sm ${color.bg} ${color.border}`}
                >
                  {pinned && (
                    <Pin className="absolute top-2 right-8 size-3 text-amber-500 fill-amber-500" />
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-6">
                    {note.content_raw}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-current/10">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => togglePin(note)}
                        className={`p-1 rounded hover:bg-foreground/10 transition-colors ${pinned ? 'text-amber-500' : 'text-muted-foreground'}`}
                        title={pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="size-3" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        disabled={deletingId === note.id}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete note"
                      >
                        {deletingId === note.id
                          ? <Loader2 className="size-3 animate-spin" />
                          : <Trash2 className="size-3" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
