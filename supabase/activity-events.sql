-- ============================================================
-- Qwix CRM — Activity Events System (Central Event Bus)
-- ADDITIVE MIGRATION — append-only, never deleted
-- ============================================================

-- ── 1. ACTIVITY EVENTS (Append-only event bus) ──────────────
CREATE TABLE IF NOT EXISTS activity_events (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid        REFERENCES companies ON DELETE CASCADE,
  workspace_id   uuid        REFERENCES workspaces ON DELETE SET NULL,
  actor_id       uuid        REFERENCES auth.users ON DELETE SET NULL,
  actor_type     text        NOT NULL DEFAULT 'user'
                             CHECK (actor_type IN ('user','system','automation','super_admin')),
  event_type     text        NOT NULL,
  -- Event types:
  -- lead.created, lead.updated, lead.deleted, lead.status_changed, lead.assigned
  -- task.created, task.completed, task.deleted, task.updated
  -- pipeline.stage_changed, pipeline.created, pipeline.deleted
  -- whatsapp.message_sent, whatsapp.reply_received
  -- sms.sent, email.sent
  -- note.added, comment.added
  -- member.invited, member.joined, member.removed, member.role_changed
  -- invite.sent, invite.accepted, invite.expired
  -- company.created, company.updated, company.suspended, company.plan_changed
  -- feature.toggled
  -- impersonation.started, impersonation.ended
  -- automation.triggered, automation.completed, automation.failed
  -- ai.scored_lead, ai.generated_summary
  -- job.enqueued, job.completed, job.failed
  resource_type  text,       -- 'lead', 'task', 'company', etc.
  resource_id    uuid,
  resource_label text,       -- human-readable name, e.g. lead full_name
  metadata       jsonb       DEFAULT '{}',
  ip_address     text,
  user_agent     text,
  created_at     timestamptz DEFAULT now()
);

-- ── 2. RLS ───────────────────────────────────────────────────
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- Company members can read their company's events
DROP POLICY IF EXISTS "members_read_company_events" ON activity_events;
CREATE POLICY "members_read_company_events" ON activity_events FOR SELECT
  USING (
    company_id IS NULL  -- system events visible to all authenticated
    OR company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Members can insert events for their own company
DROP POLICY IF EXISTS "members_insert_company_events" ON activity_events;
CREATE POLICY "members_insert_company_events" ON activity_events FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Service role has full access
DROP POLICY IF EXISTS "service_role_full_events" ON activity_events;
CREATE POLICY "service_role_full_events" ON activity_events FOR ALL
  USING (auth.role() = 'service_role');

-- NEVER allow UPDATE or DELETE from client side — append-only
-- (only service role can fix data errors)

-- ── 3. INDEXES FOR PERFORMANCE ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_company     ON activity_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type        ON activity_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_actor       ON activity_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_resource    ON activity_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_events_workspace   ON activity_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at  ON activity_events(created_at DESC);

-- ── 4. REALTIME ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;

SELECT 'Activity events schema complete' AS status;
