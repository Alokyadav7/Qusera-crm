-- ============================================================
-- Qwix CRM — Impersonation Sessions Schema
-- ADDITIVE MIGRATION
-- ============================================================

-- ── 1. IMPERSONATION SESSIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id    uuid        REFERENCES auth.users ON DELETE SET NULL NOT NULL,
  target_company_id uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  target_user_id    uuid        REFERENCES auth.users ON DELETE SET NULL,
  reason            text        NOT NULL,
  actions_taken     jsonb[]     DEFAULT '{}',
  ip_address        text,
  user_agent        text,
  started_at        timestamptz DEFAULT now(),
  ended_at          timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- ── 2. PLATFORM ADMINS ───────────────────────────────────────
-- Track who is a super admin (platform owner)
-- is_platform_admin is stored in auth.users.raw_user_meta_data
-- This table provides an additional lookup
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id     uuid    REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  granted_by  uuid    REFERENCES auth.users ON DELETE SET NULL,
  granted_at  timestamptz DEFAULT now(),
  is_active   boolean DEFAULT true,
  notes       text
);

-- ── 3. RLS ───────────────────────────────────────────────────
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins        ENABLE ROW LEVEL SECURITY;

-- Only service role can manage impersonation sessions
DROP POLICY IF EXISTS "service_role_manage_impersonation" ON impersonation_sessions;
CREATE POLICY "service_role_manage_impersonation" ON impersonation_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Platform admins can read their own sessions
DROP POLICY IF EXISTS "super_admins_read_own_sessions" ON impersonation_sessions;
CREATE POLICY "super_admins_read_own_sessions" ON impersonation_sessions FOR SELECT
  USING (super_admin_id = auth.uid());

-- Platform admins table: only service role manages
DROP POLICY IF EXISTS "service_role_manage_platform_admins" ON platform_admins;
CREATE POLICY "service_role_manage_platform_admins" ON platform_admins FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_impersonation_admin   ON impersonation_sessions(super_admin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_company ON impersonation_sessions(target_company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_active  ON impersonation_sessions(ended_at) WHERE ended_at IS NULL;

SELECT 'Impersonation schema complete' AS status;
