'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createLead(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }
  
  const lead = {
    user_id: user.id,
    full_name: formData.get('full_name') as string,
    phone_number: formData.get('phone_number') as string || null,
    email: formData.get('email') as string || null,
    company: formData.get('company') as string || null,
    source: formData.get('source') as string || 'other',
    buying_intent: formData.get('buying_intent') as string || 'medium',
    city: formData.get('city') as string || null,
    state: formData.get('state') as string || null,
    estimated_budget: formData.get('estimated_budget') ? Number(formData.get('estimated_budget')) : null,
    status: 'new',
    sentiment_score: 0,
  }
  
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating lead:', error)
    throw new Error('Failed to create lead')
  }
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
  
  return data
}

export async function updateLead(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const updates = {
    full_name: formData.get('full_name') as string,
    phone_number: formData.get('phone_number') as string || null,
    email: formData.get('email') as string || null,
    company: formData.get('company') as string || null,
    status: formData.get('status') as string,
    buying_intent: formData.get('buying_intent') as string,
    city: formData.get('city') as string || null,
    state: formData.get('state') as string || null,
    estimated_budget: formData.get('estimated_budget') ? Number(formData.get('estimated_budget')) : null,
    deal_value: formData.get('deal_value') ? Number(formData.get('deal_value')) : null,
    gstin: formData.get('gstin') as string || null,
    pan_number: formData.get('pan_number') as string || null,
    updated_at: new Date().toISOString(),
  }
  
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating lead:', error)
    throw new Error('Failed to update lead')
  }
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
  
  return data
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting lead:', error)
    throw new Error('Failed to delete lead')
  }
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating lead status:', error)
    throw new Error('Failed to update lead status')
  }
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
  
  return data
}
