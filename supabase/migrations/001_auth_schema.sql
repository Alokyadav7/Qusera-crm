-- ============================================================
-- Qwix CRM — 001: Auth & Access Control Schema
-- Full consolidated migration — tables + RLS policies
-- Run in: Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS + DROP IF EXISTS for policies)
-- ============================================================

-- ── 1. platform_admins ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  is_active  boolean     DEFAULT true,
  granted_by uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Only service_role can touch platform_admins (never expose to client)
DROP POLICY IF EXISTS "service_role_only_platform_admins" ON platform_admins;
CREATE POLICY "service_role_only_platform_admins" ON platform_admins FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. companies ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                       uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                     text        NOT NULL,
  slug                     text        NOT NULL UNIQUE,
  industry                 text,
  team_size                text,
  logo_url                 text,
  brand_color              text        DEFAULT '#18181b',
  timezone                 text        DEFAULT 'Asia/Kolkata',
  currency                 text        DEFAULT 'INR',
  plan                     text        DEFAULT 'free'
                                       CHECK (plan IN ('free','pro','enterprise')),
  status                   text        DEFAULT 'active'
                                       CHECK (status IN ('trial','active','suspended','canceled','deleted')),
  trial_ends_at            timestamptz DEFAULT (now() + interval '14 days'),
  onboarding_completed_at  timestamptz,
  owner_id                 uuid        REFERENCES auth.users ON DELETE SET NULL,
  deleted_at               timestamptz,
  deleted_by               uuid        REFERENCES auth.users ON DELETE SET NULL,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_can_read_own_company"    ON companies;
DROP POLICY IF EXISTS "owner_admin_can_update_company"  ON companies;
DROP POLICY IF EXISTS "service_role_full_companies"     ON companies;

CREATE POLICY "members_can_read_own_company" ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "owner_admin_can_update_company" ON companies FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM company_members
      WHERE company_id = companies.id
        AND role IN ('owner','admin')
        AND is_active = true
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "service_role_full_companies" ON companies FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. company_members ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_members (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  user_id      uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role         text        NOT NULL DEFAULT 'sales_rep'
                           CHECK (role IN ('owner','admin','manager','sales_rep','field_agent')),
  status       text        DEFAULT 'active'
                           CHECK (status IN ('active','deactivated')),
  is_active    boolean     DEFAULT true,
  workspace_ids uuid[]     DEFAULT '{}',
  invited_by   uuid        REFERENCES auth.users ON DELETE SET NULL,
  invited_at   timestamptz,
  joined_at    timestamptz DEFAULT now(),
  last_active_at timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (company_id, user_id)
);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_can_read_same_company_members" ON company_members;
DROP POLICY IF EXISTS "owner_admin_can_manage_members"        ON company_members;
DROP POLICY IF EXISTS "service_role_full_members"             ON company_members;

CREATE POLICY "members_can_read_same_company_members" ON company_members FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members cm
      WHERE cm.user_id = auth.uid() AND cm.is_active = true AND cm.deleted_at IS NULL
    )
  );

CREATE POLICY "owner_admin_can_manage_members" ON company_members
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('owner','admin')
        AND cm.is_active = true
        AND cm.deleted_at IS NULL
    )
  );

CREATE POLICY "service_role_full_members" ON company_members FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. invites ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  workspace_id uuid,
  email        text        NOT NULL,
  role         text        NOT NULL DEFAULT 'sales_rep'
                           CHECK (role IN ('admin','manager','sales_rep','field_agent')),
  token        text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by   uuid        REFERENCES auth.users ON DELETE SET NULL,
  accepted_at  timestamptz,
  accepted_by  uuid        REFERENCES auth.users ON DELETE SET NULL,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_admin_can_manage_invites" ON invites;
DROP POLICY IF EXISTS "service_role_full_invites"      ON invites;

CREATE POLICY "owner_admin_can_manage_invites" ON invites FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin')
        AND is_active = true
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "service_role_full_invites" ON invites FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. Additive columns on existing CRM tables ───────────────
-- Safely add company_id + soft-delete to existing tables

ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gst_status   text DEFAULT 'pending';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pan_status   text DEFAULT 'pending';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary   text;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE interactions ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS content_raw  text;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS ai_summary   text;

-- ── 6. RLS on CRM tables ─────────────────────────────────────

-- LEADS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_tenant_select" ON leads;
DROP POLICY IF EXISTS "leads_tenant_insert" ON leads;
DROP POLICY IF EXISTS "leads_tenant_update" ON leads;
DROP POLICY IF EXISTS "leads_tenant_delete" ON leads;
DROP POLICY IF EXISTS "leads_service_role"  ON leads;

CREATE POLICY "leads_tenant_select" ON leads FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "leads_tenant_insert" ON leads FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "leads_tenant_update" ON leads FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "leads_tenant_delete" ON leads FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "leads_service_role" ON leads FOR ALL USING (auth.role() = 'service_role');

-- TASKS (same pattern)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_tenant_select" ON tasks;
DROP POLICY IF EXISTS "tasks_tenant_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_tenant_update" ON tasks;
DROP POLICY IF EXISTS "tasks_tenant_delete" ON tasks;
DROP POLICY IF EXISTS "tasks_service_role"  ON tasks;

CREATE POLICY "tasks_tenant_select" ON tasks FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL)
    OR (company_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "tasks_tenant_insert" ON tasks FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL)
    OR (company_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "tasks_tenant_update" ON tasks FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL)
    OR (company_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "tasks_tenant_delete" ON tasks FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL)
    OR (company_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "tasks_service_role" ON tasks FOR ALL USING (auth.role() = 'service_role');

-- INTERACTIONS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_tenant_select" ON interactions;
DROP POLICY IF EXISTS "interactions_tenant_insert" ON interactions;
DROP POLICY IF EXISTS "interactions_tenant_update" ON interactions;
DROP POLICY IF EXISTS "interactions_service_role"  ON interactions;

CREATE POLICY "interactions_tenant_select" ON interactions FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL)
    OR (company_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "interactions_tenant_insert" ON interactions FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL)
    OR (company_id IS NULL AND user_id = auth.uid())
  );
CREATE POLICY "interactions_tenant_update" ON interactions FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL)
    OR user_id = auth.uid()
  );
CREATE POLICY "interactions_service_role" ON interactions FOR ALL USING (auth.role() = 'service_role');

-- ── 7. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_admins_user    ON platform_admins(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_companies_slug          ON companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_status        ON companies(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_company         ON company_members(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_user            ON company_members(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_members_role            ON company_members(company_id, role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invites_token           ON invites(token) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invites_email           ON invites(email, company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company           ON leads(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_company           ON tasks(company_id) WHERE deleted_at IS NULL;

SELECT 'Migration 001_auth_schema complete — all tables and RLS policies applied' AS status;
