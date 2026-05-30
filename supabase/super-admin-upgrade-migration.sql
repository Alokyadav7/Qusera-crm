-- ═══════════════════════════════════════════════════════════════════════════
-- KLINQ CRM — SUPER ADMIN UPGRADE MIGRATION
-- Run AFTER PRODUCTION-AUDIT.sql
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1: platform_alerts table (Phase 6)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_alerts (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  severity     varchar     NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  type         varchar     NOT NULL,
  title        varchar     NOT NULL,
  description  text,
  company_id   uuid        REFERENCES companies(id) ON DELETE CASCADE,
  company_name varchar,
  is_resolved  boolean     DEFAULT false,
  resolved_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at  timestamptz,
  metadata     jsonb       DEFAULT '{}',
  created_at   timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_alerts_unresolved
  ON platform_alerts(is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_company
  ON platform_alerts(company_id);

ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_alerts_super_admin_only" ON platform_alerts;
CREATE POLICY "platform_alerts_super_admin_only"
  ON platform_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Allow service_role full access (used by cron/edge functions)
DROP POLICY IF EXISTS "platform_alerts_service_role" ON platform_alerts;
CREATE POLICY "platform_alerts_service_role"
  ON platform_alerts FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2: Add health_score columns to companies (Phase 5)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS health_score      integer,
  ADD COLUMN IF NOT EXISTS health_status     varchar DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS health_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_notes    text;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3: Maintenance message to platform_settings (Phase 11)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS maintenance_message text
    DEFAULT 'We are currently performing scheduled maintenance. Please check back soon.';

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4: Add status column to company_integrations (for health checks)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE company_integrations
  ADD COLUMN IF NOT EXISTS status      varchar DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message  text;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 5: Add last_login_at to profiles (for health score)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Backfill from audit_logs if available
UPDATE profiles p
SET last_login_at = (
  SELECT MAX(created_at) FROM audit_logs al
  WHERE al.user_id = p.id
  AND al.action = 'user.login_success'
)
WHERE p.last_login_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 6: Indexes for performance
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_company_login
  ON profiles(company_id, last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_health
  ON companies(health_status, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time
  ON audit_logs(action, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 7: Verify
-- ─────────────────────────────────────────────────────────────────────────

SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('platform_alerts', 'companies', 'platform_settings', 'company_integrations')
ORDER BY tablename;

-- Confirm new columns:
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'companies'
AND column_name IN ('health_score', 'health_status', 'health_checked_at', 'internal_notes');

NOTIFY pgrst, 'reload schema';

SELECT '✅ Super Admin Upgrade Migration complete' AS status;
