-- ============================================================
-- Qwix CRM — Set Super Admin / Platform Admin
-- Run in: Supabase SQL Editor (postgres role)
-- ============================================================

-- STEP 1: Ensure platform_admins table exists
CREATE TABLE IF NOT EXISTS platform_admins (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  is_active  boolean     DEFAULT true,
  granted_by uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- STEP 2: Grant super admin access by email
-- ⚠️  REPLACE 'your-email@example.com' with your actual email
INSERT INTO platform_admins (user_id, is_active)
SELECT id, true
FROM auth.users
WHERE email = 'your-email@example.com'  -- ← CHANGE THIS
ON CONFLICT (user_id) DO UPDATE SET is_active = true;

-- STEP 3: Also set metadata flag as fallback
-- ⚠️  REPLACE 'your-email@example.com' with your actual email
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_platform_admin": true}'::jsonb
WHERE email = 'your-email@example.com';  -- ← CHANGE THIS

-- Verify
SELECT
  u.email,
  pa.is_active                                          AS platform_admin_table,
  (u.raw_app_meta_data->>'is_platform_admin')::boolean AS metadata_flag
FROM auth.users u
LEFT JOIN platform_admins pa ON pa.user_id = u.id
WHERE u.email = 'your-email@example.com';  -- ← CHANGE THIS

-- Expected output: email | platform_admin_table: true | metadata_flag: true
-- If both are true → /super-admin is now accessible for this user.

-- ============================================================
-- REVOKE super admin (if needed later)
-- ============================================================
-- UPDATE platform_admins SET is_active = false WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email');
-- UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'is_platform_admin' WHERE email = 'email';
