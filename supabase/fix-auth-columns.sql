-- ============================================================
-- Qwix CRM — Auth Foundation Column Fixes
-- Run this FIRST in Supabase SQL Editor before testing login
-- URL: https://supabase.com/dashboard → SQL Editor
-- ============================================================

-- ── 1. PROFILES TABLE — Add missing auth columns ───────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed  boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_password_used    boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_super_admin        boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active             boolean     DEFAULT true,
  ADD COLUMN IF NOT EXISTS company_id            uuid        REFERENCES companies(id) ON DELETE SET NULL;

-- ── 2. COMPANIES TABLE — Add missing setup/suspension columns ──────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS setup_complete          boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS setup_step              integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason       text,
  ADD COLUMN IF NOT EXISTS brand_color             varchar(7),
  ADD COLUMN IF NOT EXISTS is_active               boolean     DEFAULT true;

-- ── 3. GRANT SUPER ADMIN to info@qusera.in ────────────────────────────────
-- This marks the platform admin account so it routes to /super-admin on login.
UPDATE profiles
SET
  is_super_admin        = true,
  onboarding_completed  = true,
  is_active             = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'info@qusera.in' LIMIT 1
);

-- Also ensure the platform_admins table row exists
INSERT INTO platform_admins (user_id, is_active)
SELECT id, true FROM auth.users WHERE email = 'info@qusera.in'
ON CONFLICT (user_id) DO UPDATE SET is_active = true;

-- ── 4. INDEXES for performance ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON profiles(is_super_admin) WHERE is_super_admin = true;

-- ── 5. VERIFY the result ──────────────────────────────────────────────────
SELECT
  u.email,
  p.is_super_admin,
  p.onboarding_completed,
  p.is_active,
  pa.is_active AS platform_admin_active
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN platform_admins pa ON pa.user_id = u.id
WHERE u.email = 'info@qusera.in';

SELECT 'Auth columns migration complete ✓' AS status;
