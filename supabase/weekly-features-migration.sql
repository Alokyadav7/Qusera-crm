-- ============================================================
-- Klinq CRM — Weekly Features Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Add suspension_reason to companies ────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- ── 2. Documents / File Attachments ──────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),

  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,         -- MIME type
  file_size       BIGINT NOT NULL,       -- bytes
  storage_path    TEXT NOT NULL,         -- Supabase Storage path
  public_url      TEXT,                  -- signed/public URL

  category        TEXT DEFAULT 'general',  -- general | contract | invoice | proposal | other
  description     TEXT,
  tags            TEXT[] DEFAULT '{}',

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_lead    ON documents(lead_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deal    ON documents(deal_id)    WHERE deleted_at IS NULL;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_isolation ON documents;
CREATE POLICY documents_isolation ON documents
  USING (company_id = (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1
  ));

-- ── 3. Email Sequences ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sequences (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id),

  name            TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  trigger_type    TEXT DEFAULT 'manual',  -- manual | lead_created | stage_change | tag_added
  trigger_config  JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id     UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  step_number     INT NOT NULL,
  delay_hours     INT NOT NULL DEFAULT 24,   -- hours after previous step (or enrollment for step 1)
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  body_text       TEXT,

  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id     UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  enrolled_by     UUID REFERENCES profiles(id),

  current_step    INT DEFAULT 1,
  status          TEXT DEFAULT 'active',   -- active | paused | completed | unsubscribed
  next_send_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  enrolled_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(sequence_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_seq_enrollments_active   ON email_sequence_enrollments(company_id, next_send_at)
  WHERE status = 'active';

ALTER TABLE email_sequences          ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_sequences_isolation          ON email_sequences;
DROP POLICY IF EXISTS email_sequence_steps_isolation     ON email_sequence_steps;
DROP POLICY IF EXISTS email_sequence_enrollments_isolation ON email_sequence_enrollments;

CREATE POLICY email_sequences_isolation ON email_sequences
  USING (company_id = (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1));
CREATE POLICY email_sequence_steps_isolation ON email_sequence_steps
  USING (company_id = (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1));
CREATE POLICY email_sequence_enrollments_isolation ON email_sequence_enrollments
  USING (company_id = (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1));

-- ── 4. Lead Capture Forms ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_forms (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id),

  name            TEXT NOT NULL,
  description     TEXT,
  is_published    BOOLEAN DEFAULT false,
  public_slug     TEXT UNIQUE,           -- e.g. acme-contact-form

  fields          JSONB NOT NULL DEFAULT '[]',  -- array of field configs
  settings        JSONB DEFAULT '{}',           -- redirect_url, thank_you_message, notify_email
  branding        JSONB DEFAULT '{}',           -- logo_url, accent_color, company_name_override

  submit_count    INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_form_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id         UUID NOT NULL REFERENCES lead_forms(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id),    -- set after lead created

  data            JSONB NOT NULL DEFAULT '{}',  -- raw form submission data
  ip_address      TEXT,
  user_agent      TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_forms_company  ON lead_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_form_subs_form ON lead_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_slug     ON lead_forms(public_slug) WHERE is_published = true;

ALTER TABLE lead_forms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_submissions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_forms_isolation      ON lead_forms;
DROP POLICY IF EXISTS lead_form_subs_isolation  ON lead_form_submissions;

CREATE POLICY lead_forms_isolation ON lead_forms
  USING (company_id = (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1));
CREATE POLICY lead_form_subs_isolation ON lead_form_submissions
  USING (company_id = (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1));

-- ── 5. Sales Goals ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_goals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id),  -- NULL = team goal

  name            TEXT NOT NULL,
  metric          TEXT NOT NULL,   -- revenue | leads_created | deals_closed | calls_made | emails_sent
  target_value    NUMERIC(15, 2) NOT NULL,
  current_value   NUMERIC(15, 2) DEFAULT 0,

  period_type     TEXT NOT NULL DEFAULT 'monthly',  -- weekly | monthly | quarterly | yearly
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,

  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_goals_company ON sales_goals(company_id, period_start, period_end)
  WHERE is_active = true;

ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_goals_isolation ON sales_goals;
CREATE POLICY sales_goals_isolation ON sales_goals
  USING (company_id = (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1));

-- ── Done ──────────────────────────────────────────────────────
SELECT 'Klinq CRM weekly features migration completed ✅' AS status;
