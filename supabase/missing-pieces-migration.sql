-- ============================================================
-- Qwix CRM — Missing Pieces Migration
-- Adds: profiles columns, companies columns, auth_rate_limits
-- ADDITIVE — zero data loss
-- Run AFTER: super-admin-company-admin-features.sql
-- ============================================================

-- ── 1. PROFILES TABLE additions ────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temp_password_used   boolean     DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean     DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone                text;

-- ── 2. COMPANIES TABLE additions ───────────────────────────────

ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspension_reason       text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand_color             varchar(7)  DEFAULT '#18181b';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_step              integer     DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
-- Note: setup_complete, is_active, gstin, address, logo_url, plan_id 
-- are already added in super-admin-company-admin-features.sql

-- ── 3. AUTH RATE LIMITS TABLE ─────────────────────────────────
-- Persisted rate limiting (use instead of in-memory for multi-instance)

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier   text        NOT NULL,   -- email or IP
  action       text        NOT NULL,   -- login | reset_password | impersonate
  attempts     integer     DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  UNIQUE (identifier, action)
);

ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_rate_limits" ON auth_rate_limits;
CREATE POLICY "service_role_full_access_rate_limits" ON auth_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- ── 4. COMPANY INVITES TABLE (if not from previous migrations) ─

CREATE TABLE IF NOT EXISTS company_invites (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  invited_email  text        NOT NULL,
  role           text        NOT NULL DEFAULT 'sales',
  invited_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  token          text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_admins_manage_invites_ci" ON company_invites;
CREATE POLICY "company_admins_manage_invites_ci" ON company_invites
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager')
        AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "service_role_full_access_company_invites" ON company_invites;
CREATE POLICY "service_role_full_access_company_invites" ON company_invites
  FOR ALL USING (auth.role() = 'service_role');

-- ── 5. INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON auth_rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed) WHERE onboarding_completed = false;
CREATE INDEX IF NOT EXISTS idx_companies_suspension ON companies(is_active) WHERE is_active = false;

-- ── 6. Ensure setup_step defaults are sane ─────────────────────

UPDATE companies SET setup_step = 0 WHERE setup_step IS NULL;
UPDATE profiles SET temp_password_used = false WHERE temp_password_used IS NULL;
UPDATE profiles SET onboarding_completed = false WHERE onboarding_completed IS NULL;

SELECT 'Missing pieces migration complete ✓' AS status;
