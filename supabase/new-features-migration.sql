-- ============================================================
-- Qwix CRM — New Features Migration (12 modules)
-- ADDITIVE — safe to re-run, all use IF NOT EXISTS
-- ============================================================

-- ── 1. CONTACTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  workspace_id  uuid        REFERENCES workspaces ON DELETE SET NULL,
  full_name     text        NOT NULL,
  email         text,
  phone         text,
  company_name  text,
  designation   text,
  source        text        DEFAULT 'manual',
  tags          text[]      DEFAULT '{}',
  assigned_to   uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts_company_isolation" ON contacts;
CREATE POLICY "contacts_company_isolation" ON contacts FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "contacts_service_role" ON contacts;
CREATE POLICY "contacts_service_role" ON contacts FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_email   ON contacts(email) WHERE deleted_at IS NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;

-- ── 2. ACCOUNTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  name          text        NOT NULL,
  industry      text,
  website       text,
  gst_number    text,
  pan_number    text,
  city          text,
  state         text,
  assigned_to   uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounts_company_isolation" ON accounts;
CREATE POLICY "accounts_company_isolation" ON accounts FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "accounts_service_role" ON accounts;
CREATE POLICY "accounts_service_role" ON accounts FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;

-- ── 3. DEALS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  workspace_id  uuid        REFERENCES workspaces ON DELETE SET NULL,
  title         text        NOT NULL,
  value         numeric     DEFAULT 0,
  currency      text        DEFAULT 'INR',
  stage         text        DEFAULT 'prospect'
                            CHECK (stage IN ('prospect','qualified','proposal','negotiation','won','lost')),
  close_date    date,
  contact_id    uuid        REFERENCES contacts ON DELETE SET NULL,
  account_id    uuid        REFERENCES accounts ON DELETE SET NULL,
  assigned_to   uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  probability   integer     DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  notes         text,
  last_activity_at timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deals_company_isolation" ON deals;
CREATE POLICY "deals_company_isolation" ON deals FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "deals_service_role" ON deals;
CREATE POLICY "deals_service_role" ON deals FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_stage   ON deals(company_id, stage) WHERE deleted_at IS NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;

-- ── 4. EMAILS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  contact_id    uuid        REFERENCES contacts ON DELETE SET NULL,
  deal_id       uuid        REFERENCES deals ON DELETE SET NULL,
  subject       text        NOT NULL,
  body          text,
  direction     text        DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  status        text        DEFAULT 'sent' CHECK (status IN ('draft','sent','delivered','opened','failed')),
  opened_at     timestamptz,
  sent_by       uuid        REFERENCES auth.users ON DELETE SET NULL,
  tracking_id   text        UNIQUE DEFAULT gen_random_uuid()::text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emails_company_isolation" ON emails;
CREATE POLICY "emails_company_isolation" ON emails FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "emails_service_role" ON emails;
CREATE POLICY "emails_service_role" ON emails FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_emails_company  ON emails(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_tracking ON emails(tracking_id);
ALTER PUBLICATION supabase_realtime ADD TABLE emails;

-- ── 5. WHATSAPP MESSAGES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  contact_id    uuid        REFERENCES contacts ON DELETE SET NULL,
  phone         text        NOT NULL,
  message       text        NOT NULL,
  direction     text        DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  status        text        DEFAULT 'sent' CHECK (status IN ('pending','sent','delivered','read','failed')),
  meta_message_id text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_company_isolation" ON whatsapp_messages;
CREATE POLICY "whatsapp_company_isolation" ON whatsapp_messages FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "whatsapp_service_role" ON whatsapp_messages;
CREATE POLICY "whatsapp_service_role" ON whatsapp_messages FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_wa_company ON whatsapp_messages(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_phone   ON whatsapp_messages(phone, company_id);
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- ── 6. AUTOMATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  name          text        NOT NULL,
  trigger_event text        NOT NULL,
  conditions    jsonb       DEFAULT '{}',
  actions       jsonb       DEFAULT '[]',
  is_active     boolean     DEFAULT true,
  run_count     integer     DEFAULT 0,
  last_run_at   timestamptz,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id uuid        REFERENCES automations ON DELETE CASCADE NOT NULL,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  triggered_at  timestamptz DEFAULT now(),
  status        text        DEFAULT 'success' CHECK (status IN ('success','failed','skipped')),
  details       jsonb       DEFAULT '{}'
);

ALTER TABLE automations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automations_company_isolation"      ON automations;
DROP POLICY IF EXISTS "automation_logs_company_isolation"  ON automation_logs;
CREATE POLICY "automations_company_isolation"     ON automations FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "automation_logs_company_isolation" ON automation_logs FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "automations_service_role"      ON automations;
DROP POLICY IF EXISTS "automation_logs_service_role"  ON automation_logs;
CREATE POLICY "automations_service_role"     ON automations     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "automation_logs_service_role" ON automation_logs FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id) WHERE is_active = true;
ALTER PUBLICATION supabase_realtime ADD TABLE automations;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_logs;

-- ── 7. AI SCORE on leads ──────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_score integer DEFAULT 0 CHECK (ai_score BETWEEN 0 AND 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_score_updated_at timestamptz;

-- ── 8. DEAL HEALTH: last_activity_at already on deals ─────────
-- stale_alert_days stored in companies settings (use metadata jsonb or add column)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{"stale_deal_days": 7}';

-- ── 9. API KEYS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  name          text        NOT NULL,
  key_prefix    text        NOT NULL,
  key_hash      text        NOT NULL,
  last_used_at  timestamptz,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  is_active     boolean     DEFAULT true
);

CREATE TABLE IF NOT EXISTS webhooks (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  url           text        NOT NULL,
  events        jsonb       DEFAULT '[]',
  secret        text        DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active     boolean     DEFAULT true,
  last_fired_at timestamptz,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_company_isolation" ON api_keys;
DROP POLICY IF EXISTS "webhooks_company_isolation"  ON webhooks;
CREATE POLICY "api_keys_company_isolation" ON api_keys FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner','admin') AND deleted_at IS NULL));
CREATE POLICY "webhooks_company_isolation" ON webhooks FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner','admin') AND deleted_at IS NULL));
DROP POLICY IF EXISTS "api_keys_service_role" ON api_keys;
DROP POLICY IF EXISTS "webhooks_service_role"  ON webhooks;
CREATE POLICY "api_keys_service_role" ON api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "webhooks_service_role" ON webhooks  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhooks_company  ON webhooks(company_id)  WHERE is_active = true;

-- ── 10. CRM INVOICES (company's own, NOT Qwix billing) ────────
CREATE TABLE IF NOT EXISTS crm_invoices (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  contact_id    uuid        REFERENCES contacts ON DELETE SET NULL,
  deal_id       uuid        REFERENCES deals ON DELETE SET NULL,
  number        text        NOT NULL,
  line_items    jsonb       DEFAULT '[]',
  subtotal      numeric     DEFAULT 0,
  tax_percent   numeric     DEFAULT 18,
  total         numeric     DEFAULT 0,
  currency      text        DEFAULT 'INR',
  status        text        DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','viewed','paid','overdue','cancelled')),
  due_date      date,
  sent_at       timestamptz,
  paid_at       timestamptz,
  notes         text,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE crm_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_invoices_company_isolation" ON crm_invoices;
CREATE POLICY "crm_invoices_company_isolation" ON crm_invoices FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "crm_invoices_service_role" ON crm_invoices;
CREATE POLICY "crm_invoices_service_role" ON crm_invoices FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_crm_invoices_company ON crm_invoices(company_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE crm_invoices;

-- ── 11. SAVED REPORTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_reports (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  name          text        NOT NULL,
  report_type   text        DEFAULT 'table' CHECK (report_type IN ('table','bar','line','pie')),
  data_source   text        DEFAULT 'leads' CHECK (data_source IN ('leads','deals','contacts','tasks','emails')),
  config        jsonb       DEFAULT '{}',
  is_shared     boolean     DEFAULT false,
  created_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_reports_company_isolation" ON saved_reports;
CREATE POLICY "saved_reports_company_isolation" ON saved_reports FOR ALL
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
DROP POLICY IF EXISTS "saved_reports_service_role" ON saved_reports;
CREATE POLICY "saved_reports_service_role" ON saved_reports FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_saved_reports_company ON saved_reports(company_id, created_at DESC);

-- ── Reload schema cache ───────────────────────────────────────
SELECT pg_notify('pgrst', 'reload schema');
SELECT 'All 12-feature migration complete' AS status;
