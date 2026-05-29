-- ============================================================
-- Qwix CRM — Background Job Queue Schema
-- ADDITIVE MIGRATION — provider-agnostic abstraction
-- ============================================================

-- ── 1. JOB QUEUE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_queue (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies ON DELETE CASCADE,
  job_type     text        NOT NULL,
  -- send_email, send_whatsapp, send_sms, ai_process, ai_score_lead,
  -- generate_report, export_data, run_automation, sync_contacts,
  -- send_bulk_sms, send_bulk_whatsapp, import_leads
  payload      jsonb       NOT NULL DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','processing','done','failed','canceled')),
  priority     integer     NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  attempts     integer     NOT NULL DEFAULT 0,
  max_attempts integer     NOT NULL DEFAULT 3,
  last_error   text,
  result       jsonb,
  scheduled_at timestamptz DEFAULT now(),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  created_by   uuid        REFERENCES auth.users ON DELETE SET NULL
);

-- ── 2. RLS ───────────────────────────────────────────────────
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Company members can see their company's jobs
DROP POLICY IF EXISTS "members_read_jobs" ON job_queue;
CREATE POLICY "members_read_jobs" ON job_queue FOR SELECT
  USING (
    company_id IS NULL
    OR company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Members can insert jobs for their own company
DROP POLICY IF EXISTS "members_insert_jobs" ON job_queue;
CREATE POLICY "members_insert_jobs" ON job_queue FOR INSERT
  WITH CHECK (
    company_id IS NULL
    OR company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Service role (worker) has full access
DROP POLICY IF EXISTS "service_role_manage_jobs" ON job_queue;
CREATE POLICY "service_role_manage_jobs" ON job_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority ON job_queue(status, priority DESC, scheduled_at ASC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_company         ON job_queue(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_type            ON job_queue(job_type, status);

-- ── 4. REALTIME (for job monitor in super admin) ─────────────
ALTER PUBLICATION supabase_realtime ADD TABLE job_queue;

SELECT 'Job queue schema complete' AS status;
