-- ============================================================
-- OrbitCRM — PATCH MIGRATION v2 (run in Supabase SQL Editor)
-- Run AFTER FINAL-MIGRATION.sql
-- https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql
-- ============================================================

-- 1. GST/PAN compliance columns on leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS gst_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS pan_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS aadhaar_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_verified boolean DEFAULT false;

-- 2. Tasks: lead linkage + location address (for Route Planner)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_address text;

-- 3. Index for fast task-to-lead lookup
CREATE INDEX IF NOT EXISTS tasks_lead_id_idx ON tasks(lead_id);

-- 4. GST/PAN search indexes
CREATE INDEX IF NOT EXISTS leads_gstin_idx ON leads(gstin);
CREATE INDEX IF NOT EXISTS leads_pan_idx ON leads(pan_number);

-- 5. Lead source index (used in Lead Sources analytics)
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);

-- 6. Ensure notes column exists on leads (used by AI Summary)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tags text[];

-- 7. Webhook policy: allow service role to insert without user session
DROP POLICY IF EXISTS "Service role bypass" ON leads;

-- 8. Reload schema cache
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'OrbitCRM patch migration v2 complete!' AS status;
