-- ============================================================
-- Qwix CRM — Subscriptions & Invoices Schema
-- ADDITIVE — safe to re-run, zero data loss
-- Run in: Supabase SQL Editor
-- ============================================================

-- ── Plans catalog ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id            text        PRIMARY KEY,  -- 'free', 'pro', 'enterprise'
  display_name  text        NOT NULL,
  price_monthly integer     NOT NULL DEFAULT 0,  -- in paise (INR)
  sort_order    integer     DEFAULT 0,
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

INSERT INTO plans (id, display_name, price_monthly, sort_order) VALUES
  ('free',        'Free',        0,       0),
  ('pro',         'Pro',         299900,  1),
  ('enterprise',  'Enterprise',  999900,  2)
ON CONFLICT (id) DO NOTHING;

-- ── Feature definitions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_definitions (
  id          uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text  NOT NULL UNIQUE,
  name        text  NOT NULL,
  category    text  NOT NULL DEFAULT 'core',
  description text,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO feature_definitions (key, name, category) VALUES
  ('leads.unlimited',      'Unlimited Leads',        'crm'),
  ('leads.bulk_import',    'Bulk Lead Import',        'crm'),
  ('leads.ai_scoring',     'AI Lead Scoring',         'ai'),
  ('voice.to_crm',         'Voice to CRM',            'ai'),
  ('compliance.gst_pan',   'GST / PAN Verification',  'compliance'),
  ('analytics.advanced',   'Advanced Analytics',      'analytics'),
  ('integrations.api',     'API Access',              'integrations'),
  ('team.unlimited_seats', 'Unlimited Team Seats',    'team'),
  ('workspaces.multiple',  'Multiple Workspaces',     'team')
ON CONFLICT (key) DO NOTHING;

-- ── Plan ↔ Feature mapping ────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_features (
  plan_id      text  REFERENCES plans(id) ON DELETE CASCADE,
  feature_key  text  REFERENCES feature_definitions(key) ON DELETE CASCADE,
  is_enabled   boolean DEFAULT false,
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (plan_id, feature_key)
);

-- Free plan features
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES
  ('free', 'leads.unlimited',      false),
  ('free', 'leads.bulk_import',    false),
  ('free', 'leads.ai_scoring',     false),
  ('free', 'voice.to_crm',         false),
  ('free', 'compliance.gst_pan',   false),
  ('free', 'analytics.advanced',   false),
  ('free', 'integrations.api',     false),
  ('free', 'team.unlimited_seats', false),
  ('free', 'workspaces.multiple',  false)
ON CONFLICT DO NOTHING;

-- Pro plan features
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES
  ('pro', 'leads.unlimited',      true),
  ('pro', 'leads.bulk_import',    true),
  ('pro', 'leads.ai_scoring',     true),
  ('pro', 'voice.to_crm',         true),
  ('pro', 'compliance.gst_pan',   true),
  ('pro', 'analytics.advanced',   true),
  ('pro', 'integrations.api',     false),
  ('pro', 'team.unlimited_seats', false),
  ('pro', 'workspaces.multiple',  false)
ON CONFLICT DO NOTHING;

-- Enterprise plan features
INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES
  ('enterprise', 'leads.unlimited',      true),
  ('enterprise', 'leads.bulk_import',    true),
  ('enterprise', 'leads.ai_scoring',     true),
  ('enterprise', 'voice.to_crm',         true),
  ('enterprise', 'compliance.gst_pan',   true),
  ('enterprise', 'analytics.advanced',   true),
  ('enterprise', 'integrations.api',     true),
  ('enterprise', 'team.unlimited_seats', true),
  ('enterprise', 'workspaces.multiple',  true)
ON CONFLICT DO NOTHING;

-- ── Subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id            uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id               text        REFERENCES plans(id) DEFAULT 'free',
  status                text        DEFAULT 'trial'
                                    CHECK (status IN ('trial','active','past_due','canceled','paused')),
  mrr                   integer     DEFAULT 0,  -- monthly recurring revenue in INR
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  trial_ends_at         timestamptz DEFAULT (now() + interval '14 days'),
  razorpay_payment_id   text,
  razorpay_order_id     text,
  canceled_at           timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ── Invoices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id           uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  amount               integer     NOT NULL,  -- in INR
  currency             text        DEFAULT 'INR',
  status               text        DEFAULT 'pending'
                                   CHECK (status IN ('pending','paid','failed','refunded')),
  razorpay_payment_id  text,
  razorpay_order_id    text,
  paid_at              timestamptz,
  created_at           timestamptz DEFAULT now()
);

-- ── RLS on billing tables ─────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features  ENABLE ROW LEVEL SECURITY;

-- Plans and features are public (readable by all authenticated users)
DROP POLICY IF EXISTS "plans_readable_by_all"         ON plans;
DROP POLICY IF EXISTS "plan_features_readable_by_all" ON plan_features;
CREATE POLICY "plans_readable_by_all"         ON plans         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "plan_features_readable_by_all" ON plan_features FOR SELECT USING (auth.role() = 'authenticated');

-- Subscriptions: only company members can read
DROP POLICY IF EXISTS "company_members_can_read_sub"  ON subscriptions;
DROP POLICY IF EXISTS "service_role_full_access_sub"  ON subscriptions;
CREATE POLICY "company_members_can_read_sub" ON subscriptions FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
  ));
CREATE POLICY "service_role_full_access_sub" ON subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Invoices: only company members can read
DROP POLICY IF EXISTS "company_members_can_read_inv"  ON invoices;
DROP POLICY IF EXISTS "service_role_full_access_inv"  ON invoices;
CREATE POLICY "company_members_can_read_inv" ON invoices FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
  ));
CREATE POLICY "service_role_full_access_inv" ON invoices FOR ALL USING (auth.role() = 'service_role');

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_company      ON invoices(company_id);

SELECT 'Billing schema applied: plans, feature_definitions, plan_features, subscriptions, invoices' AS status;
