-- ============================================================
-- Qwix CRM — Notifications + Audit Logs + Deal Activities
-- Run in: Supabase SQL Editor
-- ============================================================

-- ── 1. NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title        text        NOT NULL,
  body         text,
  entity_type  text,       -- 'lead' | 'deal' | 'task' | 'message'
  entity_id    uuid,
  read         boolean     DEFAULT false NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_notifications" ON notifications;
CREATE POLICY "users_own_notifications" ON notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_notifications" ON notifications;
CREATE POLICY "service_role_notifications" ON notifications FOR ALL
  USING (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── 2. AUDIT LOGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies(id) ON DELETE SET NULL,
  user_id      uuid        REFERENCES auth.users ON DELETE SET NULL,
  user_email   text,
  action       text        NOT NULL,   -- 'lead.created', 'deal.stage_changed', etc.
  entity_type  text        NOT NULL,   -- 'lead', 'deal', 'contact', etc.
  entity_id    uuid,
  old_value    jsonb,
  new_value    jsonb,
  ip_address   inet,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_view_audit_logs" ON audit_logs;
CREATE POLICY "admins_view_audit_logs" ON audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_audit_logs" ON audit_logs;
CREATE POLICY "service_role_audit_logs" ON audit_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. DEAL ACTIVITIES (Pipeline stage history) ─────────────
CREATE TABLE IF NOT EXISTS deal_activities (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id     uuid        NOT NULL,   -- references leads.id
  company_id  uuid        REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users ON DELETE SET NULL,
  type        text        NOT NULL DEFAULT 'stage_change',
  from_stage  text,
  to_stage    text,
  note        text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_activities_company ON deal_activities(company_id, created_at DESC);

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_activities_company" ON deal_activities;
CREATE POLICY "deal_activities_company" ON deal_activities FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_deal_activities" ON deal_activities;
CREATE POLICY "service_role_deal_activities" ON deal_activities FOR ALL
  USING (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE deal_activities;

-- ── 4. TRIGGER: Auto-notify on new lead ─────────────────────
-- Creates a notification for the company when a lead is inserted
CREATE OR REPLACE FUNCTION notify_on_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  v_company_id := NEW.company_id;
  IF v_company_id IS NOT NULL THEN
    INSERT INTO notifications(company_id, user_id, title, body, entity_type, entity_id)
    VALUES (
      v_company_id,
      NEW.user_id,
      'New lead: ' || NEW.full_name,
      'A new lead was added from ' || COALESCE(NEW.source, 'manual'),
      'lead',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_lead ON leads;
CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_lead();

SELECT 'Notifications + Audit Logs + Deal Activities migration complete ✓' AS status;
