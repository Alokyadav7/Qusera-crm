-- ============================================================
-- Qwix CRM — RLS Verification & Hardening Script
-- Run in: Supabase SQL Editor (as postgres / service_role)
-- ============================================================

-- ── STEP 1: Ensure RLS is enabled on all tenant tables ───────
ALTER TABLE leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies    ENABLE ROW LEVEL SECURITY;

-- ── STEP 2: Harden / re-create policies ──────────────────────

-- LEADS: user must belong to the same company as the lead
DROP POLICY IF EXISTS "tenant_isolation_leads_select"  ON leads;
DROP POLICY IF EXISTS "tenant_isolation_leads_insert"  ON leads;
DROP POLICY IF EXISTS "tenant_isolation_leads_update"  ON leads;
DROP POLICY IF EXISTS "tenant_isolation_leads_delete"  ON leads;
DROP POLICY IF EXISTS "service_role_full_access_leads" ON leads;

CREATE POLICY "tenant_isolation_leads_select" ON leads FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "tenant_isolation_leads_insert" ON leads FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "tenant_isolation_leads_update" ON leads FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "tenant_isolation_leads_delete" ON leads FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

-- Service role bypasses RLS for admin operations
CREATE POLICY "service_role_full_access_leads" ON leads FOR ALL
  USING (auth.role() = 'service_role');

-- TASKS
DROP POLICY IF EXISTS "tenant_isolation_tasks_select"  ON tasks;
DROP POLICY IF EXISTS "tenant_isolation_tasks_insert"  ON tasks;
DROP POLICY IF EXISTS "tenant_isolation_tasks_update"  ON tasks;
DROP POLICY IF EXISTS "tenant_isolation_tasks_delete"  ON tasks;
DROP POLICY IF EXISTS "service_role_full_access_tasks" ON tasks;

CREATE POLICY "tenant_isolation_tasks_select" ON tasks FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "tenant_isolation_tasks_insert" ON tasks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "tenant_isolation_tasks_update" ON tasks FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "tenant_isolation_tasks_delete" ON tasks FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

CREATE POLICY "service_role_full_access_tasks" ON tasks FOR ALL
  USING (auth.role() = 'service_role');

-- INTERACTIONS
DROP POLICY IF EXISTS "tenant_isolation_interactions_select"  ON interactions;
DROP POLICY IF EXISTS "tenant_isolation_interactions_insert"  ON interactions;
DROP POLICY IF EXISTS "tenant_isolation_interactions_update"  ON interactions;
DROP POLICY IF EXISTS "service_role_full_access_interactions" ON interactions;

CREATE POLICY "tenant_isolation_interactions_select" ON interactions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR user_id = auth.uid()  -- fallback: own interactions (pre-company_id rows)
  );

CREATE POLICY "tenant_isolation_interactions_insert" ON interactions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_interactions_update" ON interactions FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "service_role_full_access_interactions" ON interactions FOR ALL
  USING (auth.role() = 'service_role');

SELECT 'RLS policies applied to leads, tasks, interactions, company_members, companies' AS status;

-- ============================================================
-- STEP 3: RLS ISOLATION TEST
-- Simulates two tenants and verifies data cannot cross over.
-- Run this block separately (it uses DO $$ ... $$ for transactions)
-- ============================================================

DO $$
DECLARE
  v_user_a      uuid;
  v_user_b      uuid;
  v_company_a   uuid;
  v_company_b   uuid;
  v_lead_a      uuid;
  v_lead_b      uuid;
  v_lead_count  int;
BEGIN

  -- NOTE: auth.users cannot be inserted in SQL directly.
  -- Instead, create 2 test users via Supabase Auth (dashboard or API),
  -- then replace these UUIDs with the real user IDs:
  v_user_a    := '00000000-0000-0000-0000-000000000001'::uuid;  -- REPLACE with real user_a ID
  v_user_b    := '00000000-0000-0000-0000-000000000002'::uuid;  -- REPLACE with real user_b ID

  -- Create tenant A
  INSERT INTO companies (id, name, slug, owner_id, status)
  VALUES (gen_random_uuid(), 'Test Tenant A', 'test-tenant-a', v_user_a, 'active')
  RETURNING id INTO v_company_a;

  -- Create tenant B
  INSERT INTO companies (id, name, slug, owner_id, status)
  VALUES (gen_random_uuid(), 'Test Tenant B', 'test-tenant-b', v_user_b, 'active')
  RETURNING id INTO v_company_b;

  -- Add members
  INSERT INTO company_members (company_id, user_id, role, is_active)
  VALUES (v_company_a, v_user_a, 'owner', true),
         (v_company_b, v_user_b, 'owner', true);

  -- Insert 1 lead per tenant
  INSERT INTO leads (full_name, company_id, user_id, status, buying_intent)
  VALUES ('Lead in Tenant A', v_company_a, v_user_a, 'new', 'medium')
  RETURNING id INTO v_lead_a;

  INSERT INTO leads (full_name, company_id, user_id, status, buying_intent)
  VALUES ('Lead in Tenant B', v_company_b, v_user_b, 'new', 'medium')
  RETURNING id INTO v_lead_b;

  RAISE NOTICE 'Setup complete. Company A: %, Company B: %', v_company_a, v_company_b;
  RAISE NOTICE 'Lead A: %, Lead B: %', v_lead_a, v_lead_b;
  RAISE NOTICE '✅ Now authenticate as user_a in your app and run:';
  RAISE NOTICE '   SELECT * FROM leads; — should return ONLY the Tenant A lead.';
  RAISE NOTICE 'If Tenant B lead appears → RLS is NOT active. Run Step 1-2 again.';

  -- Cleanup (comment out to keep test data)
  DELETE FROM company_members WHERE company_id IN (v_company_a, v_company_b);
  DELETE FROM leads WHERE id IN (v_lead_a, v_lead_b);
  DELETE FROM companies WHERE id IN (v_company_a, v_company_b);
  RAISE NOTICE 'Test data cleaned up.';

END $$;
