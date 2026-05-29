-- ============================================================
-- Qwix CRM — Seed Super Admin
-- Run ONCE in: Supabase SQL Editor (postgres / service_role)
-- ============================================================
-- STEP 1: Find your user UUID
-- After signing up at /register (or creating a user in Supabase Auth dashboard),
-- run this to find your UUID:
--
--   SELECT id, email FROM auth.users WHERE email = 'your@email.com';
--
-- Copy the UUID and replace 'YOUR_USER_UUID_HERE' below.
-- ============================================================

DO $$
DECLARE
  v_user_id   uuid;
  v_email     text := 'your@email.com';  -- ← CHANGE THIS to your email
BEGIN

  -- Lookup user by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'No user found with email %. Create the account first at /register or in Supabase Auth dashboard.', v_email;
  END IF;

  -- Insert into platform_admins (idempotent)
  INSERT INTO platform_admins (user_id, is_active)
  VALUES (v_user_id, true)
  ON CONFLICT (user_id) DO UPDATE SET is_active = true;

  -- Set metadata flag (used by middleware for fast check without extra DB query)
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                       || '{"is_platform_admin": true}'::jsonb
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Super Admin granted to % (%)', v_email, v_user_id;
  RAISE NOTICE '   Visit /super-admin to verify access.';
  RAISE NOTICE '   To revoke: UPDATE platform_admins SET is_active = false WHERE user_id = ''%'';', v_user_id;

END $$;

-- Verify
SELECT
  u.email,
  pa.is_active                                              AS platform_admin_table,
  (u.raw_app_meta_data->>'is_platform_admin')::boolean     AS metadata_flag
FROM auth.users u
JOIN platform_admins pa ON pa.user_id = u.id
WHERE pa.is_active = true;
