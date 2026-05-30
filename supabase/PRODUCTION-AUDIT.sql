-- ═══════════════════════════════════════════════════════════════════════════
-- KLINQ CRM — FINAL PRE-LAUNCH SQL
-- Run this ENTIRE file in Supabase SQL Editor BEFORE going live.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1: VERIFY SUPER ADMIN EXISTS
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users
  WHERE email = 'klinqcrm@gmail.com' LIMIT 1;

  IF v_uid IS NOT NULL THEN
    -- Ensure profiles row exists and is flagged as super admin
    INSERT INTO profiles (id, full_name, email, is_super_admin, onboarding_completed, is_active)
    VALUES (v_uid, 'Klinq Admin', 'klinqcrm@gmail.com', true, true, true)
    ON CONFLICT (id) DO UPDATE
      SET is_super_admin       = true,
          onboarding_completed = true,
          is_active            = true,
          full_name            = COALESCE(profiles.full_name, 'Klinq Admin');

    -- Ensure platform_admins row exists
    INSERT INTO platform_admins (user_id, is_active, notes)
    VALUES (v_uid, true, 'Primary super admin')
    ON CONFLICT (user_id) DO UPDATE SET is_active = true;

    RAISE NOTICE 'Super admin set for klinqcrm@gmail.com (uid: %)', v_uid;
  ELSE
    RAISE WARNING 'User klinqcrm@gmail.com not found in auth.users. Create the account first then re-run.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2: PLATFORM SETTINGS — ensure singleton row exists
-- Note: column names are platform_name, support_email etc. (NOT crm_name)
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO platform_settings (
  id,
  platform_name,
  support_email,
  default_sender_name,
  default_sender_email,
  daily_sms_limit,
  daily_whatsapp_limit,
  daily_email_limit,
  maintenance_mode
) VALUES (
  1,
  'Klinq CRM',
  'klinqcrm@gmail.com',
  'Klinq CRM',
  'klinqcrm@gmail.com',
  500,
  200,
  1000,
  false
) ON CONFLICT (id) DO UPDATE
  SET platform_name        = COALESCE(platform_settings.platform_name, 'Klinq CRM'),
      support_email        = COALESCE(platform_settings.support_email, 'klinqcrm@gmail.com'),
      default_sender_name  = COALESCE(platform_settings.default_sender_name, 'Klinq CRM'),
      default_sender_email = COALESCE(platform_settings.default_sender_email, 'klinqcrm@gmail.com');

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3: CREATE invites TABLE (code uses 'invites', not 'company_invites')
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invites (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid,
  email        text        NOT NULL,
  role         text        NOT NULL DEFAULT 'sales',
  invited_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  token        text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at  timestamptz,
  accepted_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- Safety: add columns that the accept route writes (if table already existed with old schema)
ALTER TABLE invites ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS accepted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_invites" ON invites;
CREATE POLICY "service_role_invites" ON invites FOR ALL
  USING (auth.role() = 'service_role');

-- Company members (admin/manager/owner) can view their company's invites
DROP POLICY IF EXISTS "company_members_view_invites" ON invites;
CREATE POLICY "company_members_view_invites" ON invites FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Public read for invite acceptance — token is the secret, no additional auth needed yet
DROP POLICY IF EXISTS "invites_public_token_read" ON invites;
CREATE POLICY "invites_public_token_read" ON invites FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_invites_token      ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_company_id ON invites(company_id);
CREATE INDEX IF NOT EXISTS idx_invites_email      ON invites(email, company_id);

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4: ADD MISSING custom_domain COLUMN TO companies
-- (admin settings page reads/writes this field)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_domain text;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 5: ENSURE ALL CRM TABLES HAVE company_id
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE leads        ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE contacts     ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Create deals table if it doesn't exist
CREATE TABLE IF NOT EXISTS deals (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        REFERENCES companies(id) ON DELETE CASCADE,
  lead_id     uuid        REFERENCES leads(id) ON DELETE SET NULL,
  contact_id  uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  title       text        NOT NULL DEFAULT '',
  stage       text        NOT NULL DEFAULT 'prospect',
  value       numeric(14,2) DEFAULT 0,
  currency    text        DEFAULT 'INR',
  close_date  date,
  assigned_to uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes       text,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_deals" ON deals;
CREATE POLICY "service_role_deals" ON deals FOR ALL
  USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "members_own_company_deals" ON deals;
CREATE POLICY "members_own_company_deals" ON deals FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

-- Ensure company_integrations table exists (used by admin overview page)
CREATE TABLE IF NOT EXISTS company_integrations (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id       uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  integration_type text        NOT NULL,
  config           jsonb       DEFAULT '{}',
  is_active        boolean     DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (company_id, integration_type)
);

ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_integrations" ON company_integrations;
CREATE POLICY "service_role_integrations" ON company_integrations FOR ALL
  USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "members_view_integrations" ON company_integrations;
CREATE POLICY "members_view_integrations" ON company_integrations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 6: NULL company_id AUDIT
-- Check these SELECTs — if any return > 0, run the DELETEs below
-- ─────────────────────────────────────────────────────────────────────────

SELECT 'leads'        AS tbl, COUNT(*) AS null_company_id FROM leads        WHERE company_id IS NULL
UNION ALL
SELECT 'contacts',                COUNT(*) FROM contacts     WHERE company_id IS NULL
UNION ALL
SELECT 'deals',                   COUNT(*) FROM deals        WHERE company_id IS NULL
UNION ALL
SELECT 'tasks',                   COUNT(*) FROM tasks        WHERE company_id IS NULL
UNION ALL
SELECT 'interactions',            COUNT(*) FROM interactions WHERE company_id IS NULL;

-- ▶ If any counts > 0, run these (remove the -- to uncomment):
-- DELETE FROM leads        WHERE company_id IS NULL;
-- DELETE FROM contacts     WHERE company_id IS NULL;
-- DELETE FROM deals        WHERE company_id IS NULL;
-- DELETE FROM tasks        WHERE company_id IS NULL;
-- DELETE FROM interactions WHERE company_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 7: INDEXES for performance
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_leads_company_id    ON leads(company_id, created_at DESC)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_company    ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_stage ON deals(company_id, stage)               WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_company       ON tasks(company_id)                      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_integrations_co     ON company_integrations(company_id);

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 8: VERIFY EVERYTHING
-- ─────────────────────────────────────────────────────────────────────────

-- Check all expected tables exist:
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify super admin:
SELECT id, email, is_super_admin, onboarding_completed, is_active
FROM profiles WHERE email = 'klinqcrm@gmail.com';

-- Verify platform settings:
SELECT id, platform_name, support_email, maintenance_mode
FROM platform_settings;

-- Verify invites table:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'invites' AND table_schema = 'public'
ORDER BY column_name;

-- Verify custom_domain column:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'companies' AND column_name = 'custom_domain';

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 9: Reload PostgREST schema cache (REQUIRED after schema changes)
-- ─────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

SELECT '✅ Klinq CRM — Final pre-launch SQL executed successfully' AS status;
