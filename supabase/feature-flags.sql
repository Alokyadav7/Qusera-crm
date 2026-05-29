-- ============================================================
-- Qwix CRM — Feature Flag System
-- ADDITIVE MIGRATION — no hardcoded plan checks in code
-- ============================================================

-- ── 1. FEATURE DEFINITIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_definitions (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  key             text    NOT NULL UNIQUE,
  name            text    NOT NULL,
  description     text,
  category        text    DEFAULT 'general'
                          CHECK (category IN ('general','ai','communication','analytics','automation','billing','admin')),
  default_enabled boolean DEFAULT false,
  is_beta         boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Seed all platform features
INSERT INTO feature_definitions (key, name, description, category, default_enabled) VALUES
  -- Core
  ('leads_management',    'Leads Management',    'Full lead CRUD, import, export',           'general',       true),
  ('tasks_management',    'Tasks Management',    'Task creation, assignment, tracking',       'general',       true),
  ('pipeline_view',       'Pipeline View',       'Kanban pipeline for lead stages',           'general',       true),
  ('contacts',            'Contacts',            'Client contacts and addresses',             'general',       true),
  ('analytics_basic',     'Basic Analytics',     'Core dashboard stats and pipeline chart',  'analytics',     true),
  -- AI
  ('ai_assistant',        'AI Assistant',        'AI chat assistant and suggestions',         'ai',            false),
  ('ai_lead_scoring',     'AI Lead Scoring',     'Auto-score leads with sentiment analysis',  'ai',            false),
  ('ai_voice_to_crm',     'Voice to CRM',        'Convert voice notes to CRM entries',        'ai',            false),
  ('ai_summaries',        'AI Summaries',        'Auto-generate interaction summaries',       'ai',            false),
  -- Communication
  ('whatsapp',            'WhatsApp',            'WhatsApp messaging integration',            'communication', false),
  ('sms',                 'SMS',                 'Bulk SMS via Fast2SMS',                     'communication', false),
  ('email_sequences',     'Email Sequences',     'Automated email sequences',                 'communication', false),
  -- Analytics
  ('analytics_advanced',  'Advanced Analytics',  'Revenue, conversion, cohort analytics',     'analytics',     false),
  ('custom_reports',      'Custom Reports',      'Build and export custom reports',           'analytics',     false),
  -- Automation
  ('automations',         'Automations',         'Workflow automation rules',                 'automation',    false),
  ('webhooks',            'Webhooks',            'Outbound webhooks on events',               'automation',    false),
  ('api_access',          'API Access',          'REST API for external integrations',        'automation',    false),
  -- Admin
  ('custom_domain',       'Custom Domain',       'Use your own domain for the workspace',    'admin',         false),
  ('custom_branding',     'Custom Branding',     'Logo, colors, workspace branding',         'admin',         true),
  ('bulk_export',         'Bulk Export',         'Export all data as CSV/XLSX',              'admin',         false),
  ('audit_logs',          'Audit Logs',          'Full audit trail of all actions',          'admin',         false),
  ('multi_workspace',     'Multi-Workspace',     'Create multiple workspaces per company',   'admin',         false)
ON CONFLICT (key) DO NOTHING;

-- ── 2. PLAN FEATURES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_features (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id      uuid    REFERENCES plans ON DELETE CASCADE NOT NULL,
  feature_key  text    REFERENCES feature_definitions(key) ON DELETE CASCADE NOT NULL,
  is_enabled   boolean DEFAULT true,
  UNIQUE (plan_id, feature_key)
);

-- Free plan features
WITH p AS (SELECT id FROM plans WHERE name = 'free')
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, k, true FROM p,
UNNEST(ARRAY['leads_management','tasks_management','pipeline_view','contacts','analytics_basic','custom_branding']) k
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Starter plan features
WITH p AS (SELECT id FROM plans WHERE name = 'starter')
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, k, true FROM p,
UNNEST(ARRAY['leads_management','tasks_management','pipeline_view','contacts','analytics_basic',
  'custom_branding','whatsapp','sms','ai_voice_to_crm','ai_lead_scoring','bulk_export','audit_logs']) k
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Pro plan features
WITH p AS (SELECT id FROM plans WHERE name = 'pro')
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, k, true FROM p,
UNNEST(ARRAY['leads_management','tasks_management','pipeline_view','contacts','analytics_basic',
  'analytics_advanced','custom_reports','custom_branding','whatsapp','sms','email_sequences',
  'ai_assistant','ai_voice_to_crm','ai_lead_scoring','ai_summaries','automations','webhooks',
  'api_access','bulk_export','audit_logs','custom_domain','multi_workspace']) k
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Enterprise: all features
WITH p AS (SELECT id FROM plans WHERE name = 'enterprise')
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, key, true FROM p, feature_definitions
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- ── 3. COMPANY FEATURE OVERRIDES ─────────────────────────────
CREATE TABLE IF NOT EXISTS company_feature_overrides (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid    REFERENCES companies ON DELETE CASCADE NOT NULL,
  feature_key  text    REFERENCES feature_definitions(key) ON DELETE CASCADE NOT NULL,
  is_enabled   boolean NOT NULL,
  reason       text,
  enabled_by   uuid    REFERENCES auth.users ON DELETE SET NULL,
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (company_id, feature_key)
);

-- ── 4. HELPER FUNCTION ──────────────────────────────────────
-- Use this in code: SELECT check_feature(company_id, 'ai_assistant')
CREATE OR REPLACE FUNCTION check_feature(p_company_id uuid, p_feature_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_override boolean;
  v_override_expires timestamptz;
  v_plan_enabled boolean;
  v_default boolean;
BEGIN
  -- 1. Check company override (with expiry check)
  SELECT is_enabled, expires_at INTO v_override, v_override_expires
  FROM company_feature_overrides
  WHERE company_id = p_company_id AND feature_key = p_feature_key
  LIMIT 1;

  IF FOUND THEN
    IF v_override_expires IS NULL OR v_override_expires > now() THEN
      RETURN v_override;
    END IF;
  END IF;

  -- 2. Check plan features via subscription
  SELECT pf.is_enabled INTO v_plan_enabled
  FROM plan_features pf
  JOIN subscriptions s ON s.plan_id = pf.plan_id
  WHERE s.company_id = p_company_id AND pf.feature_key = p_feature_key
  LIMIT 1;

  IF FOUND THEN
    RETURN v_plan_enabled;
  END IF;

  -- 3. Fall back to feature default
  SELECT default_enabled INTO v_default
  FROM feature_definitions WHERE key = p_feature_key;

  RETURN COALESCE(v_default, false);
END;
$$;

-- ── 5. RLS ───────────────────────────────────────────────────
ALTER TABLE feature_definitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features               ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_feature_overrides   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_defs_public_read" ON feature_definitions;
CREATE POLICY "feature_defs_public_read" ON feature_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_features_public_read" ON plan_features;
CREATE POLICY "plan_features_public_read" ON plan_features FOR SELECT USING (true);

DROP POLICY IF EXISTS "members_read_own_overrides" ON company_feature_overrides;
CREATE POLICY "members_read_own_overrides" ON company_feature_overrides FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "service_role_manage_overrides" ON company_feature_overrides;
CREATE POLICY "service_role_manage_overrides" ON company_feature_overrides FOR ALL
  USING (auth.role() = 'service_role');

-- ── 6. INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plan_features_key      ON plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_overrides_company      ON company_feature_overrides(company_id);
CREATE INDEX IF NOT EXISTS idx_overrides_key          ON company_feature_overrides(feature_key);

SELECT 'Feature flags schema complete' AS status;
