-- ============================================================
-- Fix: Add is_super_admin column to profiles table
-- Run this in Supabase SQL Editor → https://supabase.com/dashboard
-- ============================================================

-- 1. Add the column if it doesn't exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- 2. Grant super admin to info@qusera.in
UPDATE profiles 
SET is_super_admin = true 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'info@qusera.in'
);

-- 3. Ensure platform_admins row exists too
INSERT INTO platform_admins (user_id, is_active)
SELECT id, true FROM auth.users WHERE email = 'info@qusera.in'
ON CONFLICT (user_id) DO UPDATE SET is_active = true;

-- Verify
SELECT 
  u.email, 
  p.is_super_admin, 
  pa.is_active AS platform_admin
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN platform_admins pa ON pa.user_id = u.id
WHERE u.email = 'info@qusera.in';
