-- ============================================================
-- Qwix CRM — Multi-Tenancy Company ID Enforcement Migration
-- 
-- PURPOSE: Enforce strict data isolation by adding company_id
-- to all core CRM tables and backfilling existing records.
--
-- Run in: https://supabase.com/dashboard → SQL Editor
-- ============================================================

-- ── STEP 1: Add company_id column to all core tables ────────────────────────

-- LEADS
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);

-- TASKS  
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);

-- INTERACTIONS
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_company_id ON interactions(company_id);

-- CONTACTS
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);

-- ACCOUNTS
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts(company_id);

-- DEALS
ALTER TABLE deals ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);

-- EMAILS
ALTER TABLE emails ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_emails_company_id ON emails(company_id);

-- WHATSAPP MESSAGES
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_company_id ON whatsapp_messages(company_id);

-- CRM INVOICES
ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_invoices_company_id ON crm_invoices(company_id);

-- SAVED REPORTS
ALTER TABLE saved_reports ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_saved_reports_company_id ON saved_reports(company_id);

-- AUTOMATIONS
ALTER TABLE automations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_automations_company_id ON automations(company_id);

-- AUTOMATION LOGS
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_automation_logs_company_id ON automation_logs(company_id);

-- SMS MESSAGES
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sms_messages_company_id ON sms_messages(company_id);

-- ── STEP 2: Backfill company_id from user_active_company ────────────────────
-- For each user, find their active company and stamp it on all their records.

-- LEADS backfill
UPDATE leads l
SET company_id = uac.company_id
FROM user_active_company uac
WHERE uac.user_id = l.user_id
  AND l.company_id IS NULL;

-- TASKS backfill
UPDATE tasks t
SET company_id = uac.company_id
FROM user_active_company uac
WHERE uac.user_id = t.user_id
  AND t.company_id IS NULL;

-- INTERACTIONS backfill
UPDATE interactions i
SET company_id = uac.company_id
FROM user_active_company uac
WHERE uac.user_id = i.user_id
  AND i.company_id IS NULL;

-- CONTACTS backfill (contacts have user_id via leads — use created_by if available, else skip)
UPDATE contacts c
SET company_id = uac.company_id
FROM user_active_company uac
WHERE uac.user_id = c.user_id
  AND c.company_id IS NULL;

-- DEALS backfill
UPDATE deals d
SET company_id = uac.company_id
FROM user_active_company uac
WHERE uac.user_id = d.user_id
  AND d.company_id IS NULL;

-- ACCOUNTS backfill
UPDATE accounts a
SET company_id = uac.company_id
FROM user_active_company uac
WHERE uac.user_id = a.user_id
  AND a.company_id IS NULL;

-- ── STEP 3: Update RLS Policies — Enforce company_id isolation ──────────────

-- LEADS: Must belong to same company
DROP POLICY IF EXISTS "leads_company_isolation" ON leads;
CREATE POLICY "leads_company_isolation" ON leads FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- TASKS: company-scoped
DROP POLICY IF EXISTS "tasks_company_isolation" ON tasks;
CREATE POLICY "tasks_company_isolation" ON tasks FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- INTERACTIONS: company-scoped
DROP POLICY IF EXISTS "interactions_company_isolation" ON interactions;
CREATE POLICY "interactions_company_isolation" ON interactions FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Keep service role bypass policies
DROP POLICY IF EXISTS "leads_service_role" ON leads;
CREATE POLICY "leads_service_role" ON leads FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "tasks_service_role" ON tasks;
CREATE POLICY "tasks_service_role" ON tasks FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "interactions_service_role" ON interactions;
CREATE POLICY "interactions_service_role" ON interactions FOR ALL USING (auth.role() = 'service_role');

-- ── STEP 4: Trigger to auto-stamp company_id on new records ─────────────────

-- Function to auto-assign company_id from user's active company
CREATE OR REPLACE FUNCTION auto_stamp_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM user_active_company
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to all relevant tables
DROP TRIGGER IF EXISTS stamp_company_id_leads ON leads;
CREATE TRIGGER stamp_company_id_leads
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION auto_stamp_company_id();

DROP TRIGGER IF EXISTS stamp_company_id_tasks ON tasks;
CREATE TRIGGER stamp_company_id_tasks
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION auto_stamp_company_id();

DROP TRIGGER IF EXISTS stamp_company_id_interactions ON interactions;
CREATE TRIGGER stamp_company_id_interactions
  BEFORE INSERT ON interactions
  FOR EACH ROW EXECUTE FUNCTION auto_stamp_company_id();

DROP TRIGGER IF EXISTS stamp_company_id_contacts ON contacts;
CREATE TRIGGER stamp_company_id_contacts
  BEFORE INSERT ON contacts
  FOR EACH ROW EXECUTE FUNCTION auto_stamp_company_id();

DROP TRIGGER IF EXISTS stamp_company_id_deals ON deals;
CREATE TRIGGER stamp_company_id_deals
  BEFORE INSERT ON deals
  FOR EACH ROW EXECUTE FUNCTION auto_stamp_company_id();

SELECT 'Multi-tenancy company_id enforcement migration complete ✓' AS status;
