-- ============================================================
-- Qwix CRM — Usage Tracking Schema
-- ADDITIVE MIGRATION
-- ============================================================

-- ── 1. USAGE EVENTS (Raw ticks) ──────────────────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  workspace_id uuid       REFERENCES workspaces ON DELETE SET NULL,
  user_id     uuid        REFERENCES auth.users ON DELETE SET NULL,
  metric_key  text        NOT NULL,
  -- api_call, ai_token, whatsapp_message, sms_sent,
  -- storage_byte, automation_run, email_sent, export_run
  quantity    bigint      NOT NULL DEFAULT 1,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- ── 2. USAGE SUMMARIES (Aggregated rollups) ──────────────────
CREATE TABLE IF NOT EXISTS usage_summaries (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      uuid        REFERENCES companies ON DELETE CASCADE NOT NULL,
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  period_type     text        NOT NULL CHECK (period_type IN ('day','month')),
  metric_key      text        NOT NULL,
  total_quantity  bigint      NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (company_id, period_start, period_type, metric_key)
);

-- ── 3. RLS ───────────────────────────────────────────────────
ALTER TABLE usage_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_summaries ENABLE ROW LEVEL SECURITY;

-- Company admins/owners can read usage
DROP POLICY IF EXISTS "admins_read_usage_events" ON usage_events;
CREATE POLICY "admins_read_usage_events" ON usage_events FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','manager') AND deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "service_role_manage_usage" ON usage_events;
CREATE POLICY "service_role_manage_usage" ON usage_events FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admins_read_usage_summaries" ON usage_summaries;
CREATE POLICY "admins_read_usage_summaries" ON usage_summaries FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin','manager') AND deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "service_role_manage_summaries" ON usage_summaries;
CREATE POLICY "service_role_manage_summaries" ON usage_summaries FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usage_events_company    ON usage_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_metric     ON usage_events(company_id, metric_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_summaries_company ON usage_summaries(company_id, period_type, period_start DESC);

SELECT 'Usage tracking schema complete' AS status;
