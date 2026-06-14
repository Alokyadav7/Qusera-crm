-- ============================================================
-- Fix: profiles_role_check constraint blocks onboarding
-- Run in: Supabase SQL Editor
-- Safe to run multiple times.
-- ============================================================

-- STEP 1: Drop the restrictive check constraint on profiles.role
-- (The constraint was added by a migration but doesn't include 'owner')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- STEP 2: Re-add the constraint with ALL valid roles including 'owner'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner','admin','manager','sales','sales_rep','support','marketing','field_agent','viewer'));

-- STEP 3: Also ensure company_members role constraint includes 'owner'
-- (Drop and recreate to be safe)
ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_role_check;
ALTER TABLE company_members ADD CONSTRAINT company_members_role_check
  CHECK (role IN ('owner','admin','manager','sales','sales_rep','support','marketing','field_agent','viewer'));

-- STEP 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'profiles_role_check and company_members_role_check fixed ✓' AS status;
