'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Plus, Search, Calendar as CalendarIcon, List, LayoutGrid,
  Phone, Mail, MapPin, FileText, Clock, CheckCircle2, AlertCircle,
  MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react'
import { CRMHeader } from '@/components/crm/crm-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { format, isToday, isTomorrow, isPast, startOfWeek, addDays, isSameDay } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  description: string | null
  due_date: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  is_completed: boolean
  task_type: string
  location_address: string | null
  lead?: {
    full_name: string
    company: string | null
  } | null
}

interface TasksPageClientProps {
  initialTasks: Task[]
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30'
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800/30'
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30'
    case 'low': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
    default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
  }
}

function getTaskIcon(type: string) {
  switch (type) {
    case 'call': return <Phone className="size-4" />
    case 'email': return <Mail className="size-4" />
    case 'meeting': return <CalendarIcon className="size-4" />
    case 'site_visit': return <MapPin className="size-4" />
    case 'document_collection': return <FileText className="size-4" />
    default: return <Clock className="size-4" />
  }
}

function formatDueDate(dateString: string) {
  const date = new Date(dateString)
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`
  }
  return format(date, 'MMM d at h:mm a')
}

export function TasksPageClient({ initialTasks }: TasksPageClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'completed'>('all')
  const [leads, setLeads] = useState<{ id: string; full_name: string }[]>([])

  // ── Real-time Supabase subscription ────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select('*, lead:leads(full_name, company)')
      .order('due_date', { ascending: true })
    if (data) setTasks(data as Task[])
  }, [])

  useEffect(() => {
    fetchTasks()
    // Load leads for task assignment
    createClient().from('leads').select('id, full_name').order('full_name').limit(100)
      .then(({ data }) => { if (data) setLeads(data) })
    const supabase = createClient()
    const channel = supabase
      .channel('realtime-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCompleteTask = useCallback(async (taskId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ is_completed: true, updated_at: new Date().toISOString() }).eq('id', taskId)
    if (error) toast.error('Failed to complete task')
    else toast.success('Task completed! ✅')
  }, [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) toast.error('Failed to delete task')
    else toast.success('Task deleted')
  }, [])

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setIsSubmitting(false); return }

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      due_date: formData.get('due_date') as string,
      priority: formData.get('priority') as string || 'medium',
      task_type: formData.get('task_type') as string || 'other',
      lead_id: formData.get('lead_id') as string || null,
      location_address: formData.get('location_address') as string || null,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (error) toast.error('Failed to add task: ' + error.message)
    else { toast.success('Task created!'); setIsAddDialogOpen(false) }
    setIsSubmitting(false)
  }

  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  // Get tasks for calendar week view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Group tasks by date for calendar
  const tasksByDate = tasks.reduce((acc, task) => {
    const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(task)
    return acc
  }, {} as Record<string, typeof tasks>)

  const pendingTasks = tasks.filter(t => !t.is_completed).length
  const overdueTasks = tasks.filter(t => isPast(new Date(t.due_date)) && !t.is_completed).length
  const todayTasks = tasks.filter(t => isToday(new Date(t.due_date))).length
  const tomorrowTasks = tasks.filter(t => isTomorrow(new Date(t.due_date))).length

  return (
    <div className="flex flex-col min-h-screen">
      <CRMHeader 
        title="Tasks" 
        subtitle={tasks.length > 0 
          ? `${tasks.length} total tasks • ${pendingTasks} pending`
          : 'No tasks yet - create your first task to get started'
        }
      />
      
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Filters & Actions */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search tasks..." 
                className="pl-8"
              />
            </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-0.5">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm"
                className="h-7"
                onClick={() => setViewMode('list')}
              >
                <List className="size-4" />
              </Button>
              <Button 
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
                size="sm"
                className="h-7"
                onClick={() => setViewMode('calendar')}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4 mr-1" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task with details below.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddTask}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input id="title" name="title" required placeholder="Task title" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" placeholder="Optional description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="due_date">Due Date *</Label>
                        <Input id="due_date" name="due_date" type="datetime-local" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="task_type">Type</Label>
                      <Select name="task_type" defaultValue="other">
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">📞 Call</SelectItem>
                          <SelectItem value="meeting">📅 Meeting</SelectItem>
                          <SelectItem value="email">✉️ Email</SelectItem>
                          <SelectItem value="site_visit">📍 Site Visit</SelectItem>
                          <SelectItem value="document_collection">📄 Document Collection</SelectItem>
                          <SelectItem value="follow_up">🔄 Follow Up</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lead_id">Linked Lead (optional)</Label>
                      <select
                        name="lead_id"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">— No lead —</option>
                        {leads.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location_address">Location Address <span className="text-xs text-muted-foreground">(appears in Route Planner)</span></Label>
                      <Input id="location_address" name="location_address" placeholder="e.g. 123 MG Road, Mumbai" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Adding...' : 'Add Task'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          </div>
        </div>

        {/* Quick Filter Badges */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              All ({tasks.length})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/30">
              Overdue ({overdueTasks})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30">
              Today ({todayTasks})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/30">
              Tomorrow ({tomorrowTasks})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30">
              Completed ({tasks.filter(t => t.is_completed).length})
            </Badge>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
            <CheckCircle2 className="size-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Stay organized by creating tasks for your sales activities.
            </p>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              Add First Task
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const isOverdue = isPast(new Date(task.due_date)) && !task.is_completed
              const isComplete = task.is_completed

              return (
                <Card 
                  key={task.id} 
                  className={`transition-all ${
                    isComplete ? 'opacity-60' : ''
                  } ${isOverdue ? 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox 
                        checked={isComplete}
                        onCheckedChange={() => handleCompleteTask(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`flex size-8 items-center justify-center rounded-lg ${getPriorityColor(task.priority)}`}>
                            {getTaskIcon(task.task_type)}
                          </span>
                          <span className={`font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`ml-auto shrink-0 ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                            {isOverdue && <AlertCircle className="size-3" />}
                            <Clock className="size-3" />
                            {formatDueDate(task.due_date)}
                          </span>
                          {task.lead && (
                            <span className="flex items-center gap-1">
                              Lead: {task.lead.full_name}
                            </span>
                          )}
                          {task.location_address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {task.location_address.split(',')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 shrink-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCompleteTask(task.id)}>
                            <CheckCircle2 className="size-4 mr-2" />
                            Mark Complete
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="size-4 mr-2" />
                            Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* Calendar View */
          <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
            {/* Calendar Picker */}
            <Card>
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Week View */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Week of {format(weekStart, 'MMMM d, yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-8"
                      onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedDate(new Date())}
                    >
                      Today
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-8"
                      onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-2 px-2">
                <div className="grid grid-cols-7 gap-1 min-w-[560px]">
                  {weekDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayTasks = tasksByDate[dateKey] || []
                    const isCurrentDay = isToday(day)
                    const isSelected = isSameDay(day, selectedDate)

                    return (
                      <div 
                        key={dateKey}
                        className={`min-h-[120px] border rounded-lg p-2 cursor-pointer transition-colors ${
                          isCurrentDay ? 'bg-primary/5 border-primary' : 
                          isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className={`text-sm font-medium mb-2 ${
                          isCurrentDay ? 'text-primary' : ''
                        }`}>
                          <span className="block text-xs text-muted-foreground">
                            {format(day, 'EEE')}
                          </span>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayTasks.slice(0, 3).map((task) => (
                            <div 
                              key={task.id}
                              className={`text-xs p-1 rounded truncate ${getPriorityColor(task.priority)}`}
                            >
                              {format(new Date(task.due_date), 'h:mm a')} - {task.title.split(' ').slice(0, 2).join(' ')}
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayTasks.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
