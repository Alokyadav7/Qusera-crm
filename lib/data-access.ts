import { createClient } from '@/lib/supabase/server'

// Types
export interface Lead {
  id: string
  user_id: string
  full_name: string
  phone_number: string | null
  email: string | null
  company: string | null
  status: 'new' | 'contacted' | 'interested' | 'verified' | 'negotiation' | 'closed_won' | 'closed_lost'
  source: string | null
  sentiment_score: number
  buying_intent: 'high' | 'medium' | 'low'
  ai_summary: string | null
  gstin: string | null
  gst_status: 'pending' | 'verified' | 'invalid'
  pan_number: string | null
  pan_status: 'pending' | 'verified' | 'invalid'
  aadhaar_verified: boolean
  bank_verified: boolean
  estimated_budget: number | null
  deal_value: number | null
  city: string | null
  state: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  lead_id: string | null
  title: string
  description: string | null
  due_date: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  is_completed: boolean
  task_type: 'call' | 'meeting' | 'email' | 'site_visit' | 'document_collection' | 'follow_up' | 'other'
  location_address: string | null
  created_at: string
  lead?: Lead
}

export interface Interaction {
  id: string
  user_id: string
  lead_id: string | null
  type: 'voice' | 'text' | 'image' | 'whatsapp' | 'call' | 'email' | 'meeting'
  direction: 'inbound' | 'outbound'
  content_raw: string | null
  content_transcribed: string | null
  sentiment_score: number | null
  ai_extracted_data: Record<string, unknown> | null
  created_at: string
  lead?: Lead
}

export interface ComplianceDocument {
  id: string
  user_id: string
  lead_id: string
  type: 'gst_certificate' | 'pan_card' | 'aadhaar' | 'bank_statement' | 'other'
  file_name: string
  file_url: string | null
  verification_status: 'pending' | 'verified' | 'invalid'
  verified_at: string | null
  created_at: string
  lead?: Lead
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: 'admin' | 'manager' | 'sales_rep' | 'field_agent'
  team: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface DashboardStats {
  totalLeads: number
  newLeadsToday: number
  tasksToday: number
  completedTasks: number
  totalRevenue: number
  conversionRate: number
  avgResponseTime: string
}

// Leads
export async function getLeads() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Lead[]
}

export async function getLeadById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as Lead
}

export async function createLead(lead: Partial<Lead>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, user_id: user.id })
    .select()
    .single()
  
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Lead
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Tasks
export async function getTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, lead:leads(*)')
    .order('due_date', { ascending: true })
  
  if (error) throw error
  return data as Task[]
}

export async function getTasksForToday() {
  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*, lead:leads(*)')
    .gte('due_date', today.toISOString())
    .lt('due_date', tomorrow.toISOString())
    .order('due_date', { ascending: true })
  
  if (error) throw error
  return data as Task[]
}

export async function createTask(task: Partial<Task>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: user.id })
    .select()
    .single()
  
  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Task
}

export async function completeTask(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      is_completed: true, 
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Interactions
export async function getInteractions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('interactions')
    .select('*, lead:leads(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Interaction[]
}

export async function getInteractionsForLead(leadId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Interaction[]
}

export async function createInteraction(interaction: Partial<Interaction>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('interactions')
    .insert({ ...interaction, user_id: user.id })
    .select()
    .single()
  
  if (error) throw error
  return data as Interaction
}

// Compliance Documents
export async function getComplianceDocuments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('compliance_documents')
    .select('*, lead:leads(*)')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as ComplianceDocument[]
}

export async function createComplianceDocument(doc: Partial<ComplianceDocument>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('compliance_documents')
    .insert({ ...doc, user_id: user.id })
    .select()
    .single()
  
  if (error) throw error
  return data as ComplianceDocument
}

export async function updateComplianceDocument(id: string, updates: Partial<ComplianceDocument>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('compliance_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as ComplianceDocument
}

// Dashboard Stats
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Get total leads
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
  
  // Get new leads today
  const { count: newLeadsToday } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
  
  // Get tasks for today
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const { count: tasksToday } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .gte('due_date', today.toISOString())
    .lt('due_date', tomorrow.toISOString())
  
  // Get completed tasks
  const { count: completedTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', true)
  
  // Get total revenue from closed deals
  const { data: closedDeals } = await supabase
    .from('leads')
    .select('deal_value, estimated_budget')
    .eq('status', 'closed_won')
  
  // Use deal_value if set, otherwise fall back to estimated_budget
  const totalRevenue = closedDeals?.reduce((sum, deal) => sum + (Number(deal.deal_value) || Number(deal.estimated_budget) || 0), 0) || 0
  
  // Calculate conversion rate
  const { count: closedWon } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'closed_won')
  
  const conversionRate = totalLeads && totalLeads > 0 ? ((closedWon || 0) / totalLeads) * 100 : 0
  
  return {
    totalLeads: totalLeads || 0,
    newLeadsToday: newLeadsToday || 0,
    tasksToday: tasksToday || 0,
    completedTasks: completedTasks || 0,
    totalRevenue,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgResponseTime: '2.4 hrs'
  }
}

// Profile
export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) return null
  return data as Profile
}

export async function updateProfile(updates: Partial<Profile>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()
  
  if (error) throw error
  return data as Profile
}
