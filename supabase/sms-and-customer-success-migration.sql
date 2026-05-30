-- ── SMS Messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      uuid        REFERENCES companies ON DELETE CASCADE,
  contact_id      uuid        REFERENCES contacts ON DELETE SET NULL,
  phone           text        NOT NULL,
  message         text        NOT NULL,
  direction       text        DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  status          text        DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  fast2sms_ref    text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_messages_isolation" ON sms_messages;
CREATE POLICY "sms_messages_isolation" ON sms_messages FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
    OR company_id IS NULL
  );

DROP POLICY IF EXISTS "sms_messages_service_role" ON sms_messages;
CREATE POLICY "sms_messages_service_role" ON sms_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_sms_company   ON sms_messages(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_phone     ON sms_messages(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_contact   ON sms_messages(contact_id) WHERE contact_id IS NOT NULL;

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;

-- ── Customer Health Snapshots (if not already created) ────────
CREATE TABLE IF NOT EXISTS customer_health_snapshots (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        REFERENCES auth.users ON DELETE CASCADE,
  lead_id         uuid        REFERENCES leads ON DELETE CASCADE NOT NULL,
  health_score    integer     DEFAULT 70 CHECK (health_score BETWEEN 0 AND 100),
  risk_level      text        DEFAULT 'watch' CHECK (risk_level IN ('good','watch','danger')),
  reasons         text[]      DEFAULT '{}',
  next_best_action text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE customer_health_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "health_snapshots_isolation" ON customer_health_snapshots;
CREATE POLICY "health_snapshots_isolation" ON customer_health_snapshots FOR ALL
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "health_snapshots_service" ON customer_health_snapshots;
CREATE POLICY "health_snapshots_service" ON customer_health_snapshots FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_health_snapshots_lead ON customer_health_snapshots(lead_id);
ALTER PUBLICATION supabase_realtime ADD TABLE customer_health_snapshots;

-- ── Renewal Opportunities (if not already created) ────────────
CREATE TABLE IF NOT EXISTS renewal_opportunities (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        REFERENCES auth.users ON DELETE CASCADE,
  lead_id         uuid        REFERENCES leads ON DELETE CASCADE NOT NULL,
  renewal_date    date,
  expected_value  numeric     DEFAULT 0,
  status          text        DEFAULT 'open' CHECK (status IN ('open','won','lost','canceled')),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE renewal_opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "renewal_ops_isolation" ON renewal_opportunities;
CREATE POLICY "renewal_ops_isolation" ON renewal_opportunities FOR ALL
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "renewal_ops_service" ON renewal_opportunities;
CREATE POLICY "renewal_ops_service" ON renewal_opportunities FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_renewal_lead ON renewal_opportunities(lead_id);
ALTER PUBLICATION supabase_realtime ADD TABLE renewal_opportunities;

-- ── Lead Score History (if not already created) ───────────────
CREATE TABLE IF NOT EXISTS lead_score_history (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        REFERENCES auth.users ON DELETE CASCADE,
  lead_id         uuid        REFERENCES leads ON DELETE CASCADE NOT NULL,
  score           integer     NOT NULL CHECK (score BETWEEN 0 AND 100),
  previous_score  integer,
  delta           integer     GENERATED ALWAYS AS (score - COALESCE(previous_score, score)) STORED,
  tier            text        DEFAULT 'cold' CHECK (tier IN ('hot','warm','cold','lost')),
  reasons         jsonb       DEFAULT '[]',
  triggered_by    text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "score_history_isolation" ON lead_score_history;
CREATE POLICY "score_history_isolation" ON lead_score_history FOR ALL
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "score_history_service" ON lead_score_history;
CREATE POLICY "score_history_service" ON lead_score_history FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_score_history_lead ON lead_score_history(lead_id, created_at DESC);

-- Notify PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');
SELECT 'SMS + Customer Success + Renewal + Score History migration complete' AS status;
