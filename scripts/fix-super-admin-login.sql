-- ============================================================
-- Klinq CRM — Fix Super Admin Login
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Make sure the platform_admins table exists
CREATE TABLE IF NOT EXISTS platform_admins (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  is_active  boolean     DEFAULT true,
  granted_by uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- STEP 2: Set your super admin email here ↓
-- Replace 'klinqcrm@gmail.com' with your actual super-admin email
DO $$
DECLARE
  v_email TEXT := 'klinqcrm@gmail.com';  -- ← CHANGE THIS TO YOUR SUPER ADMIN EMAIL
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users. Check the email is correct.', v_email;
  END IF;

  -- 1. Add to platform_admins table
  INSERT INTO platform_admins (user_id, is_active)
  VALUES (v_user_id, true)
  ON CONFLICT (user_id) DO UPDATE SET is_active = true;

  -- 2. Set is_super_admin on profiles table
  UPDATE profiles
  SET
    is_super_admin        = true,
    is_active             = true,
    onboarding_completed  = true
  WHERE id = v_user_id;

  -- 3. Set user_metadata flag (used as fallback)
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_platform_admin": true}'::jsonb
  WHERE id = v_user_id;

  -- 4. Set app_metadata flag (most reliable — persists in JWT)
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_platform_admin": true}'::jsonb
  WHERE id = v_user_id;

  RAISE NOTICE 'Super admin setup complete for %', v_email;
END $$;

-- ============================================================
-- VERIFICATION — Run this to confirm all flags are set
-- ============================================================
SELECT
  u.id,
  u.email,
  pa.is_active                                                          AS "platform_admins.is_active",
  p.is_super_admin                                                       AS "profiles.is_super_admin",
  p.is_active                                                            AS "profiles.is_active",
  p.onboarding_completed                                                 AS "profiles.onboarding_completed",
  (u.raw_user_meta_data->>'is_platform_admin')::boolean                 AS "user_meta.is_platform_admin",
  (u.raw_app_meta_data->>'is_platform_admin')::boolean                  AS "app_meta.is_platform_admin"
FROM auth.users u
LEFT JOIN platform_admins pa ON pa.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'klinqcrm@gmail.com';  -- ← SAME EMAIL AS ABOVE

-- All 4 boolean columns should be TRUE for login to work correctly
