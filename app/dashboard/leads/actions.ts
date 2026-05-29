'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function createLead(formData: FormData) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  // Get active company_id for multi-tenant isolation
  const supabase = createServiceClient()
  const { data: uac } = await (supabase as any)
    .from('user_active_company')
    .select('company_id')
    .eq('user_id', user.id)
    .single()
  
  const lead = {
    user_id: user.id,
    company_id: (uac as any)?.company_id || null,
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
    .insert(lead as any)
    .select()
    .single()
  
  if (error) throw new Error('Failed to create lead: ' + error.message)
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
  return data
}

export async function updateLead(id: string, formData: FormData) {
  const supabase = createServiceClient()
  
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
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error('Failed to update lead: ' + error.message)
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
  return data
}

export async function deleteLead(id: string) {
  const supabase = createServiceClient()
  
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error('Failed to delete lead: ' + error.message)
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = createServiceClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error('Failed to update lead status: ' + error.message)
  
  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard')
  return data
}
