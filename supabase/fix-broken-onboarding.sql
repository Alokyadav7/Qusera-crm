-- ============================================================
-- Fix: "Account Setup Incomplete" for company owners
-- Run this in Supabase SQL Editor
-- ============================================================
-- This fixes owners whose user_active_company or company_members
-- rows were not created during onboarding, causing the error.
-- ============================================================

-- STEP 1: Re-create missing user_active_company rows for owners
-- (owners exist in profiles with company_id but no active_company row)
INSERT INTO user_active_company (user_id, company_id, updated_at)
SELECT 
  p.id AS user_id,
  p.company_id,
  NOW() AS updated_at
FROM profiles p
WHERE 
  p.company_id IS NOT NULL
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM user_active_company uac WHERE uac.user_id = p.id
  )
ON CONFLICT (user_id) DO UPDATE 
  SET company_id = EXCLUDED.company_id, updated_at = NOW();

-- STEP 2: Re-create missing company_members rows for owners
INSERT INTO company_members (user_id, company_id, role, is_active, joined_at, created_at)
SELECT 
  p.id AS user_id,
  p.company_id,
  COALESCE(p.role, 'owner') AS role,
  true AS is_active,
  NOW() AS joined_at,
  NOW() AS created_at
FROM profiles p
WHERE 
  p.company_id IS NOT NULL
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM company_members cm 
    WHERE cm.user_id = p.id AND cm.company_id = p.company_id
  )
ON CONFLICT (user_id, company_id) DO UPDATE 
  SET is_active = true, role = EXCLUDED.role;

-- STEP 3: Fix companies.setup_complete for owners who already completed onboarding
-- (profile has onboarding_completed=true but company.setup_complete is still false)
UPDATE companies c
SET 
  setup_complete = true,
  setup_step = 4
FROM profiles p
WHERE 
  p.company_id = c.id
  AND p.onboarding_completed = true
  AND (c.setup_complete = false OR c.setup_complete IS NULL);

-- STEP 4: Verify — show all users and their setup status
SELECT 
  p.id,
  p.email,
  p.role,
  p.company_id,
  p.onboarding_completed,
  c.setup_complete AS company_setup_complete,
  CASE WHEN uac.user_id IS NOT NULL THEN '✅' ELSE '❌ MISSING' END AS active_company_row,
  CASE WHEN cm.user_id IS NOT NULL THEN '✅' ELSE '❌ MISSING' END AS member_row
FROM profiles p
LEFT JOIN user_active_company uac ON uac.user_id = p.id
LEFT JOIN company_members cm ON cm.user_id = p.id AND cm.company_id = p.company_id
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.is_super_admin = false OR p.is_super_admin IS NULL
ORDER BY p.created_at DESC;
