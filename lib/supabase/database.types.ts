// ─── Klinq CRM — Supabase Database Types ──────────────────────────────────────
// Covers all multi-tenant tables. Wire this into createClient<Database>().


export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [K: string]: Json }

// Alias to accept Record<string, unknown> in insert/update payloads
export type JsonObject = { [K: string]: Json }


export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string | null
          status: 'trial' | 'active' | 'suspended' | 'canceled' | 'deleted'
          logo_url: string | null
          primary_color: string
          custom_domain: string | null
          timezone: string
          currency: string
          onboarding_step: number
          onboarding_completed_at: string | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['companies']['Row']> & { name: string; slug: string }
        Update: Partial<Database['public']['Tables']['companies']['Row']>
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          company_id: string
          name: string
          slug: string
          type: 'sales' | 'support' | 'marketing' | 'custom'
          description: string | null
          is_default: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['workspaces']['Row']> & { company_id: string; name: string; slug: string }
        Update: Partial<Database['public']['Tables']['workspaces']['Row']>
        Relationships: []
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: string
          workspace_ids: string[]
          is_active: boolean
          invited_by: string | null
          invited_at: string | null
          joined_at: string
          last_active_at: string | null
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['company_members']['Row']> & { company_id: string; user_id: string; role: string }
        Update: Partial<Database['public']['Tables']['company_members']['Row']>
        Relationships: []
      }
      invites: {
        Row: {
          id: string
          company_id: string
          workspace_id: string | null
          email: string
          role: string
          token: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
          invited_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['invites']['Row']> & { company_id: string; email: string; role: string; expires_at: string }
        Update: Partial<Database['public']['Tables']['invites']['Row']>
        Relationships: []
      }
      user_active_company: {
        Row: { user_id: string; company_id: string; workspace_id: string | null; updated_at: string }
        Insert: { user_id: string; company_id: string; workspace_id?: string | null; updated_at?: string }
        Update: Partial<Database['public']['Tables']['user_active_company']['Row']>
        Relationships: []
      }
      plans: {
        Row: { id: string; name: string; display_name: string; description: string | null; price_monthly: number; price_yearly: number; is_active: boolean; sort_order: number }
        Insert: Partial<Database['public']['Tables']['plans']['Row']> & { name: string; display_name: string }
        Update: Partial<Database['public']['Tables']['plans']['Row']>
        Relationships: []
      }
      plan_limits: {
        Row: { id: string; plan_id: string; feature_key: string; limit_value: number }
        Insert: { plan_id: string; feature_key: string; limit_value: number }
        Update: Partial<Database['public']['Tables']['plan_limits']['Row']>
        Relationships: []
      }
      plan_features: {
        Row: { id: string; plan_id: string; feature_key: string; is_enabled: boolean }
        Insert: { plan_id: string; feature_key: string; is_enabled?: boolean }
        Update: Partial<Database['public']['Tables']['plan_features']['Row']>
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          company_id: string
          plan_id: string
          status: string
          billing_cycle: 'monthly' | 'yearly'
          mrr: number
          current_period_start: string
          current_period_end: string
          trial_ends_at: string | null
          razorpay_subscription_id: string | null
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']> & { company_id: string; plan_id: string }
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>
        Relationships: []
      }
      feature_definitions: {
        Row: { id: string; key: string; name: string; description: string | null; category: string; default_enabled: boolean; is_beta: boolean }
        Insert: Partial<Database['public']['Tables']['feature_definitions']['Row']> & { key: string; name: string }
        Update: Partial<Database['public']['Tables']['feature_definitions']['Row']>
        Relationships: []
      }
      company_feature_overrides: {
        Row: { id: string; company_id: string; feature_key: string; is_enabled: boolean; reason: string | null; enabled_by: string | null; expires_at: string | null; created_at: string }
        Insert: Partial<Database['public']['Tables']['company_feature_overrides']['Row']> & { company_id: string; feature_key: string; is_enabled: boolean }
        Update: Partial<Database['public']['Tables']['company_feature_overrides']['Row']>
        Relationships: []
      }
      activity_events: {
        Row: { id: string; company_id: string | null; workspace_id: string | null; actor_id: string | null; actor_type: string; event_type: string; resource_type: string | null; resource_id: string | null; resource_label: string | null; metadata: Json; ip_address: string | null; user_agent: string | null; created_at: string }
        Insert: Partial<Database['public']['Tables']['activity_events']['Row']> & { event_type: string }
        Update: Partial<Database['public']['Tables']['activity_events']['Row']>
        Relationships: []
      }
      usage_events: {
        Row: { id: string; company_id: string; workspace_id: string | null; user_id: string | null; metric_key: string; quantity: number; metadata: Json; created_at: string }
        Insert: Partial<Database['public']['Tables']['usage_events']['Row']> & { company_id: string; metric_key: string }
        Update: Partial<Database['public']['Tables']['usage_events']['Row']>
        Relationships: []
      }
      usage_summaries: {
        Row: { id: string; company_id: string; period_start: string; period_end: string; period_type: 'day' | 'month'; metric_key: string; total_quantity: number; updated_at: string }
        Insert: Partial<Database['public']['Tables']['usage_summaries']['Row']> & { company_id: string; period_start: string; period_end: string; period_type: 'day' | 'month'; metric_key: string }
        Update: Partial<Database['public']['Tables']['usage_summaries']['Row']>
        Relationships: []
      }
      job_queue: {
        Row: { id: string; company_id: string | null; job_type: string; payload: Json; status: string; priority: number; attempts: number; max_attempts: number; last_error: string | null; result: Json | null; scheduled_at: string; started_at: string | null; completed_at: string | null; created_at: string; created_by: string | null }
        Insert: Partial<Database['public']['Tables']['job_queue']['Row']> & { job_type: string; payload: Json }
        Update: Partial<Database['public']['Tables']['job_queue']['Row']>
        Relationships: []
      }
      impersonation_sessions: {
        Row: { id: string; super_admin_id: string; target_company_id: string; target_user_id: string | null; reason: string; actions_taken: Json[]; ip_address: string | null; user_agent: string | null; started_at: string; ended_at: string | null; created_at: string }
        Insert: Partial<Database['public']['Tables']['impersonation_sessions']['Row']> & { super_admin_id: string; target_company_id: string; reason: string }
        Update: Partial<Database['public']['Tables']['impersonation_sessions']['Row']>
        Relationships: []
      }
      platform_admins: {
        Row: { user_id: string; granted_by: string | null; granted_at: string; is_active: boolean; notes: string | null }
        Insert: Partial<Database['public']['Tables']['platform_admins']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['platform_admins']['Row']>
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          company_id: string | null
          user_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          phone_number: string | null
          company: string | null
          status: string
          source: string | null
          deal_value: number | null
          buying_intent: string | null
          sentiment_score: number | null
          last_contacted_at: string | null
          notes: string | null
          city: string | null
          state: string | null
          estimated_budget: number | null
          gstin: string | null
          pan_number: string | null
          pipeline_stage: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: (Partial<Database['public']['Tables']['leads']['Row']> & { full_name: string }) | (Record<string, unknown> & { full_name: string })
        Update: Partial<Database['public']['Tables']['leads']['Row']> | Record<string, unknown>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          avatar_url: string | null
          role: string
          department: string | null
          is_active: boolean
          is_super_admin: boolean | null
          onboarding_completed: boolean | null
          temp_password_used: boolean | null
          last_login_at: string | null
          invited_by: string | null
          joined_at: string | null
          updated_at: string
          company_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          meta_page_access_token: string | null
          meta_page_id: string | null
          meta_app_id: string | null
          meta_connected: boolean | null
          google_ads_customer_id: string | null
          google_ads_connected: boolean | null
          whatsapp_phone_number_id: string | null
          whatsapp_access_token: string | null
          whatsapp_connected: boolean | null
          fast2sms_api_key: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['integrations']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['integrations']['Row']>
        Relationships: []
      }
      interactions: {
        Row: {
          id: string
          user_id: string | null
          company_id: string | null
          lead_id: string | null
          type: string
          direction: string | null
          content: string | null
          status: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['interactions']['Row']>
        Update: Partial<Database['public']['Tables']['interactions']['Row']>
        Relationships: []
      }
      compliance_docs: {
        Row: {
          id: string
          lead_id: string | null
          user_id: string | null
          company_id: string | null
          doc_type: string
          status: string | null
          file_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['compliance_docs']['Row']>
        Update: Partial<Database['public']['Tables']['compliance_docs']['Row']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      check_feature: { Args: { p_company_id: string; p_feature_key: string }; Returns: boolean }
      get_current_company_id: { Args: Record<string, never>; Returns: string }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
