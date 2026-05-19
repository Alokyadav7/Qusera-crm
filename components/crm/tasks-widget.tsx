'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Clock, Phone, Mail, MapPin, FileText, Calendar, AlertCircle, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
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
  lead?: { full_name: string; company: string | null }
}

interface TasksWidgetProps {
  tasks: Task[]
  onTaskCompleted?: () => void
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function getTaskIcon(type: string) {
  switch (type) {
    case 'call': return <Phone className="size-4" />
    case 'email': return <Mail className="size-4" />
    case 'meeting': return <Calendar className="size-4" />
    case 'site_visit': return <MapPin className="size-4" />
    case 'document_collection': return <FileText className="size-4" />
    default: return <Circle className="size-4" />
  }
}

function formatDueDate(dateString: string) {
  const date = new Date(dateString)
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`
  return format(date, 'MMM d, h:mm a')
}

export function TasksWidget({ tasks, onTaskCompleted }: TasksWidgetProps) {
  const [completing, setCompleting] = useState<string | null>(null)

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId)
    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: true, updated_at: new Date().toISOString() })
      .eq('id', taskId)
    if (error) toast.error('Failed to complete task')
    else { toast.success('Task completed! ✅'); onTaskCompleted?.() }
    setCompleting(null)
  }

  const sortedTasks = [...tasks]
    .filter(t => !t.is_completed)
    .sort((a, b) => {
      const o = { critical: 0, high: 1, medium: 2, low: 3 }
      return o[a.priority] - o[b.priority]
    })
    .slice(0, 6)

  return (
    <Card className="glass-card flex flex-col h-full card-hover border-border/50 shadow-sm shadow-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-5 text-primary" />
          Upcoming Tasks
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/tasks">View All</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="size-12 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending tasks</p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/dashboard/tasks"><Plus className="size-4 mr-1" />Add Task</Link>
            </Button>
          </div>
        ) : sortedTasks.map((task) => {
          const isOverdue = isPast(new Date(task.due_date)) && !task.is_completed
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                isOverdue ? 'border-red-200 bg-red-50/50' : ''
              }`}
            >
              <Checkbox
                className="mt-0.5"
                checked={task.is_completed}
                disabled={completing === task.id}
                onCheckedChange={() => handleComplete(task.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`flex size-6 items-center justify-center rounded ${getPriorityColor(task.priority)}`}>
                    {getTaskIcon(task.task_type)}
                  </span>
                  <span className="font-medium text-sm truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                    {isOverdue && <AlertCircle className="size-3" />}
                    {formatDueDate(task.due_date)}
                  </span>
                  {task.lead && <><span>•</span><span>{task.lead.full_name}</span></>}
                </div>
                {task.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                )}
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
