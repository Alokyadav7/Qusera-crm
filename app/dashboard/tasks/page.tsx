export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TasksPageClient } from './tasks-page-client'

async function getTasksData() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return []

  const svc = createServiceClient()

  // Resolve this user's company_id — required for multi-tenant isolation
  const { data: member } = await (svc as any)
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const companyId: string | null = member?.company_id ?? null
  if (!companyId) return []

  // Fetch tasks scoped to this company only
  const { data: tasks, error } = await svc
    .from('tasks')
    .select('*, lead:leads(full_name, company)')
    .eq('company_id' as any, companyId)
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
