-- ============================================================
-- OrbitCRM — Lead Sources Migration
-- Paste this in: https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql
-- ============================================================

-- 1. Add new columns to leads table
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

-- 2. Allow webhook handlers to insert leads (no user session in webhooks)
DROP POLICY IF EXISTS "Service can insert webhook leads" ON leads;
CREATE POLICY "Service can insert webhook leads"
  ON leads FOR INSERT
  WITH CHECK (true);

-- 3. Allow webhook handlers to insert notifications
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 4. Refresh PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'Lead Sources migration complete!' AS status;
