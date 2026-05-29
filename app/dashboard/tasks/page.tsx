import { createServiceClient } from '@/lib/supabase/service'
import { TasksPageClient } from './tasks-page-client'

async function getTasksData() {
  const supabase = createServiceClient() // Bypass RLS for server render
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, lead:leads(full_name, company)')
    .order('due_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
  
  return tasks || []
}

export default async function TasksPage() {
  const tasks = await getTasksData()
  
  return <TasksPageClient initialTasks={tasks} />
}
