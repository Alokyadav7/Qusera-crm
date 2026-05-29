-- ============================================================
-- Qwix CRM — Super Admin & Company Admin Features Migration
-- Adds: company_integrations, platform_settings tables
-- Adds: missing columns to companies table
-- ADDITIVE — zero data loss
-- Run in: Supabase SQL Editor
-- ============================================================

-- ── 1. ADD MISSING COLUMNS TO companies ──────────────────────

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active        boolean     DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_complete   boolean     DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry         text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count   text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id          text        DEFAULT 'basic';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand_color      text        DEFAULT '#818cf8';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gstin            text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address          text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url         text;

-- ── 2. ADD MISSING COLUMNS TO company_members ────────────────

ALTER TABLE company_members ADD COLUMN IF NOT EXISTS department  text;
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

-- ── 3. COMPANY INTEGRATIONS ──────────────────────────────────
-- Stores API keys / config per integration type per company

CREATE TABLE IF NOT EXISTS company_integrations (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id         uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  integration_type   text        NOT NULL
                                 CHECK (integration_type IN ('resend', 'whatsapp', 'fast2sms', 'smtp', 'razorpay')),
  config             jsonb       DEFAULT '{}',
  is_active          boolean     DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (company_id, integration_type)
);

ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_admins_manage_integrations" ON company_integrations;
CREATE POLICY "company_admins_manage_integrations" ON company_integrations
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "service_role_full_access_integrations" ON company_integrations;
CREATE POLICY "service_role_full_access_integrations" ON company_integrations
  FOR ALL USING (auth.role() = 'service_role');

-- ── 4. PLATFORM SETTINGS (singleton) ─────────────────────────
-- Single row containing Qwix platform-wide configuration

CREATE TABLE IF NOT EXISTS platform_settings (
  id                     integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton
  platform_name          text        DEFAULT 'Qwix',
  platform_logo_url      text,
  support_email          text        DEFAULT 'support@qwix.app',
  default_sender_name    text        DEFAULT 'Qwix CRM',
  default_sender_email   text        DEFAULT 'noreply@qwix.app',
  daily_sms_limit        integer     DEFAULT 500,
  daily_whatsapp_limit   integer     DEFAULT 200,
  daily_email_limit      integer     DEFAULT 1000,
  maintenance_mode       boolean     DEFAULT false,
  updated_at             timestamptz DEFAULT now(),
  updated_by             uuid        REFERENCES auth.users ON DELETE SET NULL
);

-- Insert default row if not exists
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_platform_settings" ON platform_settings;
CREATE POLICY "service_role_full_access_platform_settings" ON platform_settings
  FOR ALL USING (auth.role() = 'service_role');

-- ── 5. AUDIT LOGS — ensure company_id column exists ──────────

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- ── 6. INDEXES ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_company_integrations_company ON company_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active) WHERE deleted_at IS NULL;

SELECT 'Super Admin & Company Admin features migration complete' AS status;
