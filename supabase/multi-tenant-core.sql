-- ============================================================
-- Qwix CRM — Multi-Tenant Core Schema
-- ADDITIVE MIGRATION — zero data loss
-- Run in: Supabase SQL Editor
-- ============================================================

-- ── 1. COMPANIES (Tenant Unit) ──────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  text        NOT NULL,
  slug                  text        NOT NULL UNIQUE,
  owner_id              uuid        REFERENCES auth.users ON DELETE SET NULL,
  status                text        NOT NULL DEFAULT 'trial'
                                    CHECK (status IN ('trial','active','suspended','canceled','deleted')),
  logo_url              text,
  primary_color         text        DEFAULT '#18181b',
  custom_domain         text,
  timezone              text        DEFAULT 'Asia/Kolkata',
  currency              text        DEFAULT 'INR',
  onboarding_step       integer     DEFAULT 0,
  onboarding_completed_at timestamptz,
  trial_ends_at         timestamptz DEFAULT (now() + interval '14 days'),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  deleted_at            timestamptz,
  deleted_by            uuid        REFERENCES auth.users ON DELETE SET NULL
);

-- ── 2. WORKSPACES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  name           text        NOT NULL,
  slug           text        NOT NULL,
  type           text        DEFAULT 'custom'
                             CHECK (type IN ('sales','support','marketing','custom')),
  description    text,
  is_default     boolean     DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  deleted_at     timestamptz,
  UNIQUE (company_id, slug)
);

-- ── 3. COMPANY MEMBERS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_members (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  user_id        uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role           text        NOT NULL DEFAULT 'sales'
                             CHECK (role IN ('owner','admin','manager','sales','support','marketing','viewer')),
  workspace_ids  uuid[]      DEFAULT '{}',
  is_active      boolean     DEFAULT true,
  invited_by     uuid        REFERENCES auth.users ON DELETE SET NULL,
  invited_at     timestamptz,
  joined_at      timestamptz DEFAULT now(),
  last_active_at timestamptz,
  deleted_at     timestamptz,
  UNIQUE (company_id, user_id)
);

-- ── 4. INVITES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  workspace_id   uuid        REFERENCES workspaces ON DELETE SET NULL,
  email          text        NOT NULL,
  role           text        NOT NULL DEFAULT 'sales'
                             CHECK (role IN ('admin','manager','sales','support','marketing','viewer')),
  token          text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at    timestamptz,
  accepted_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  invited_by     uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

-- ── 5. USER ACTIVE COMPANY (Org Switcher State) ──────────────
CREATE TABLE IF NOT EXISTS user_active_company (
  user_id        uuid        REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  company_id     uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  workspace_id   uuid        REFERENCES workspaces ON DELETE SET NULL,
  updated_at     timestamptz DEFAULT now()
);

-- ── 6. ADDITIVE COLUMNS ON EXISTING TABLES ──────────────────
-- leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;

-- clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 7. HELPER FUNCTION: get current company from session ─────
CREATE OR REPLACE FUNCTION get_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
$$;

-- ── 8. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces      ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_company ENABLE ROW LEVEL SECURITY;

-- companies: members can read; owner/admins can update
DROP POLICY IF EXISTS "company_members_can_read" ON companies;
CREATE POLICY "company_members_can_read" ON companies FOR SELECT
  USING (
    id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "company_owner_can_update" ON companies;
CREATE POLICY "company_owner_can_update" ON companies FOR UPDATE
  USING (owner_id = auth.uid() OR auth.uid() IN (
    SELECT user_id FROM company_members WHERE company_id = companies.id AND role IN ('owner','admin') AND deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "service_role_full_access_companies" ON companies;
CREATE POLICY "service_role_full_access_companies" ON companies FOR ALL
  USING (auth.role() = 'service_role');

-- workspaces: company members can read
DROP POLICY IF EXISTS "company_members_can_read_workspaces" ON workspaces;
CREATE POLICY "company_members_can_read_workspaces" ON workspaces FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "service_role_full_access_workspaces" ON workspaces;
CREATE POLICY "service_role_full_access_workspaces" ON workspaces FOR ALL
  USING (auth.role() = 'service_role');

-- company_members: members can see their own company's members
DROP POLICY IF EXISTS "members_can_see_company_members" ON company_members;
CREATE POLICY "members_can_see_company_members" ON company_members FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members cm WHERE cm.user_id = auth.uid() AND cm.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "service_role_full_access_members" ON company_members;
CREATE POLICY "service_role_full_access_members" ON company_members FOR ALL
  USING (auth.role() = 'service_role');

-- invites: company admins can see their company's invites
DROP POLICY IF EXISTS "company_admins_can_manage_invites" ON invites;
CREATE POLICY "company_admins_can_manage_invites" ON invites FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner','admin','manager') AND deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "service_role_full_access_invites" ON invites;
CREATE POLICY "service_role_full_access_invites" ON invites FOR ALL
  USING (auth.role() = 'service_role');

-- user_active_company: users manage their own
DROP POLICY IF EXISTS "users_manage_own_active_company" ON user_active_company;
CREATE POLICY "users_manage_own_active_company" ON user_active_company FOR ALL
  USING (user_id = auth.uid());

-- ── 9. REALTIME ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE company_members;
ALTER PUBLICATION supabase_realtime ADD TABLE invites;

-- ── 10. INDEXES FOR PERFORMANCE ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_companies_slug        ON companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_status      ON companies(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_company    ON workspaces(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_company       ON company_members(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_user          ON company_members(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invites_token         ON invites(token) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invites_email         ON invites(email, company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company         ON leads(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_company         ON tasks(company_id) WHERE deleted_at IS NULL;

SELECT 'Multi-tenant core schema migration complete' AS status;
