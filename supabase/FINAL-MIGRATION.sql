-- ============================================================
-- OrbitCRM — FINAL MIGRATION (run once in Supabase SQL Editor)
-- https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql
-- ============================================================

-- 1. Lead source columns
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS meta_lead_id text,
  ADD COLUMN IF NOT EXISTS meta_form_id text,
  ADD COLUMN IF NOT EXISTS meta_ad_name text,
  ADD COLUMN IF NOT EXISTS google_lead_id text,
  ADD COLUMN IF NOT EXISTS google_campaign_id text;

-- 2. Integrations table (one row per company/user)
CREATE TABLE IF NOT EXISTS integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  meta_page_access_token text,
  meta_page_id text,
  meta_app_id text,
  meta_connected boolean DEFAULT false,
  google_ads_customer_id text,
  google_connected boolean DEFAULT false,
  fast2sms_api_key text,
  fast2sms_sender_id text DEFAULT 'ORBITC',
  sms_connected boolean DEFAULT false,
  whatsapp_phone_number_id text,
  whatsapp_connected boolean DEFAULT false,
  webhook_secret text DEFAULT gen_random_uuid()::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS on integrations (each company only sees their own)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own integrations" ON integrations;
CREATE POLICY "Users manage own integrations"
  ON integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Allow webhook POST handlers to insert leads (no user session in webhooks)
DROP POLICY IF EXISTS "Webhook insert leads" ON leads;
CREATE POLICY "Webhook insert leads"
  ON leads FOR INSERT WITH CHECK (true);

-- 5. Allow webhook handlers to create notifications
DROP POLICY IF EXISTS "Webhook insert notifications" ON notifications;
CREATE POLICY "Webhook insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- 6. Refresh PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'OrbitCRM final migration complete!' AS status;
