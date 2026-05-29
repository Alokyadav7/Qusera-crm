-- ============================================================
-- Qwix CRM — Dev Permissive RLS Bypass
-- Run this in Supabase SQL Editor for LOCAL / DEV environments
-- DO NOT run in production — use proper auth RLS in prod
--
-- This fixes: "Error fetching leads: {}" when
-- NEXT_PUBLIC_DEV_BYPASS_AUTH=true is set and there is no
-- authenticated session (anon key hits RLS and gets blocked).
-- ============================================================

-- ── LEADS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_leads" ON leads;
CREATE POLICY "dev_anon_leads" ON leads FOR ALL
  USING (true) WITH CHECK (true);

-- ── TASKS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_tasks" ON tasks;
CREATE POLICY "dev_anon_tasks" ON tasks FOR ALL
  USING (true) WITH CHECK (true);

-- ── INTERACTIONS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_interactions" ON interactions;
CREATE POLICY "dev_anon_interactions" ON interactions FOR ALL
  USING (true) WITH CHECK (true);

-- ── PROFILES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_profiles" ON profiles;
CREATE POLICY "dev_anon_profiles" ON profiles FOR ALL
  USING (true) WITH CHECK (true);

-- ── CONTACTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_contacts" ON contacts;
CREATE POLICY "dev_anon_contacts" ON contacts FOR ALL
  USING (true) WITH CHECK (true);

-- ── ACCOUNTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_accounts" ON accounts;
CREATE POLICY "dev_anon_accounts" ON accounts FOR ALL
  USING (true) WITH CHECK (true);

-- ── DEALS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_deals" ON deals;
CREATE POLICY "dev_anon_deals" ON deals FOR ALL
  USING (true) WITH CHECK (true);

-- ── EMAILS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_emails" ON emails;
CREATE POLICY "dev_anon_emails" ON emails FOR ALL
  USING (true) WITH CHECK (true);

-- ── WHATSAPP MESSAGES ─────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_whatsapp" ON whatsapp_messages;
CREATE POLICY "dev_anon_whatsapp" ON whatsapp_messages FOR ALL
  USING (true) WITH CHECK (true);

-- ── AUTOMATIONS ──────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_automations" ON automations;
CREATE POLICY "dev_anon_automations" ON automations FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dev_anon_automation_logs" ON automation_logs;
CREATE POLICY "dev_anon_automation_logs" ON automation_logs FOR ALL
  USING (true) WITH CHECK (true);

-- ── CRM INVOICES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_crm_invoices" ON crm_invoices;
CREATE POLICY "dev_anon_crm_invoices" ON crm_invoices FOR ALL
  USING (true) WITH CHECK (true);

-- ── SAVED REPORTS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_saved_reports" ON saved_reports;
CREATE POLICY "dev_anon_saved_reports" ON saved_reports FOR ALL
  USING (true) WITH CHECK (true);

-- ── API KEYS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_api_keys" ON api_keys;
CREATE POLICY "dev_anon_api_keys" ON api_keys FOR ALL
  USING (true) WITH CHECK (true);

-- ── WEBHOOKS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_webhooks" ON webhooks;
CREATE POLICY "dev_anon_webhooks" ON webhooks FOR ALL
  USING (true) WITH CHECK (true);

-- ── SMS MESSAGES ─────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_sms_messages" ON sms_messages;
CREATE POLICY "dev_anon_sms_messages" ON sms_messages FOR ALL
  USING (true) WITH CHECK (true);

-- ── CUSTOMER HEALTH SNAPSHOTS ────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_health_snapshots" ON customer_health_snapshots;
CREATE POLICY "dev_anon_health_snapshots" ON customer_health_snapshots FOR ALL
  USING (true) WITH CHECK (true);

-- ── RENEWAL OPPORTUNITIES ────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_renewal_ops" ON renewal_opportunities;
CREATE POLICY "dev_anon_renewal_ops" ON renewal_opportunities FOR ALL
  USING (true) WITH CHECK (true);

-- ── LEAD SCORE HISTORY ───────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_score_history" ON lead_score_history;
CREATE POLICY "dev_anon_score_history" ON lead_score_history FOR ALL
  USING (true) WITH CHECK (true);

-- ── INTEGRATIONS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_integrations" ON integrations;
CREATE POLICY "dev_anon_integrations" ON integrations FOR ALL
  USING (true) WITH CHECK (true);

-- ── USER ACTIVE COMPANY ──────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_user_active_company" ON user_active_company;
CREATE POLICY "dev_anon_user_active_company" ON user_active_company FOR ALL
  USING (true) WITH CHECK (true);

-- ── COMPANIES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_companies" ON companies;
CREATE POLICY "dev_anon_companies" ON companies FOR ALL
  USING (true) WITH CHECK (true);

-- ── COMPANY MEMBERS ──────────────────────────────────────────
DROP POLICY IF EXISTS "dev_anon_company_members" ON company_members;
CREATE POLICY "dev_anon_company_members" ON company_members FOR ALL
  USING (true) WITH CHECK (true);

SELECT 'Dev bypass RLS policies applied successfully ✓' AS status;
