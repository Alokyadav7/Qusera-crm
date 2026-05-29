'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }
  
  const task = {
    user_id: user.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    due_date: formData.get('due_date') as string,
    priority: formData.get('priority') as string || 'medium',
    task_type: formData.get('task_type') as string || 'other',
    is_completed: false,
  }
  
  const { data, error } = await (supabase as any)
    .from('tasks')
    .insert(task)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating task:', error)
    throw new Error('Failed to create task')
  }
  
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard')
  
  return data
}

export async function completeTask(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await (supabase as any)
    .from('tasks')
    .update({ 
      is_completed: true, 
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error completing task:', error)
    throw new Error('Failed to complete task')
  }
  
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard')
  
  return data
}

export async function deleteTask(id: string) {
  const supabase = await createClient()
  
  const { error } = await (supabase as any)
    .from('tasks')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting task:', error)
    throw new Error('Failed to delete task')
  }
  
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard')
}
