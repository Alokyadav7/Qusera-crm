-- ============================================================
-- Qwix CRM — RBAC + Onboarding + Sequences + Products + Goals
-- Run in: Supabase SQL Editor
-- ============================================================

-- ── 1. ENHANCE company_members ───────────────────────────────
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'sales_rep'
  CHECK (role IN ('super_admin','company_admin','sales_manager','sales_rep','viewer'));
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users;
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- ── 2. TEAM INVITES (pending, for users not yet signed up) ──
CREATE TABLE IF NOT EXISTS team_invites (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        REFERENCES companies(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'sales_rep',
  invited_by  uuid        REFERENCES auth.users,
  accepted_at timestamptz,
  created_at  timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invites_email_company ON team_invites(company_id, email);

-- ── 3. ONBOARDING STATE ──────────────────────────────────────
ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_complete boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_step     int     DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone       text    DEFAULT 'Asia/Kolkata';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency       text    DEFAULT 'INR';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry       text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website        text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url       text;

-- ── 4. EMAIL SEQUENCES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sequences (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        REFERENCES companies(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  is_active   boolean     DEFAULT true,
  created_by  uuid        REFERENCES auth.users,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sequence_steps (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id uuid        NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_number int         NOT NULL,
  delay_days  int         NOT NULL DEFAULT 0,
  subject     text        NOT NULL,
  body_html   text        NOT NULL,
  from_name   text,
  from_email  text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id   uuid        NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  contact_id    uuid,
  lead_id       uuid,
  company_id    uuid        REFERENCES companies(id) ON DELETE CASCADE,
  current_step  int         DEFAULT 1,
  status        text        DEFAULT 'active'
                            CHECK (status IN ('active','paused','completed','unsubscribed')),
  enrolled_at   timestamptz DEFAULT now(),
  next_send_at  timestamptz DEFAULT now(),
  completed_at  timestamptz,
  unsubscribed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_seq_enroll_schedule ON sequence_enrollments(status, next_send_at);
CREATE INDEX IF NOT EXISTS idx_seq_enroll_company ON sequence_enrollments(company_id, status);

-- ── 5. PRODUCTS CATALOG ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid          REFERENCES companies(id) ON DELETE CASCADE,
  name        text          NOT NULL,
  description text,
  unit_price  numeric(14,2) NOT NULL DEFAULT 0,
  currency    text          NOT NULL DEFAULT 'INR',
  category    text,
  sku         text,
  is_active   boolean       DEFAULT true,
  created_by  uuid          REFERENCES auth.users,
  created_at  timestamptz   DEFAULT now(),
  updated_at  timestamptz   DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id, is_active);

CREATE TABLE IF NOT EXISTS deal_products (
  id           uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id      uuid          NOT NULL,
  product_id   uuid          REFERENCES products(id) ON DELETE SET NULL,
  company_id   uuid          REFERENCES companies(id) ON DELETE CASCADE,
  product_name text          NOT NULL,
  qty          numeric(10,3) NOT NULL DEFAULT 1,
  unit_price   numeric(14,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2)  DEFAULT 0,
  total        numeric(14,2) GENERATED ALWAYS AS (
    ROUND(qty * unit_price * (1 - discount_pct/100), 2)
  ) STORED,
  created_at   timestamptz   DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_products_deal ON deal_products(deal_id);

-- ── 6. SALES GOALS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_goals (
  id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid          REFERENCES companies(id) ON DELETE CASCADE,
  user_id        uuid          REFERENCES auth.users ON DELETE CASCADE,
  period         text          NOT NULL CHECK (period IN ('monthly','quarterly')),
  period_start   date          NOT NULL,
  period_end     date          NOT NULL,
  target_deals   int           DEFAULT 0,
  target_revenue numeric(14,2) DEFAULT 0,
  created_by     uuid          REFERENCES auth.users,
  created_at     timestamptz   DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_goals_user ON sales_goals(company_id, user_id, period_start DESC);

-- ── 7. DOCUMENTS / FILE ATTACHMENTS ─────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies(id) ON DELETE CASCADE,
  entity_type  text        NOT NULL,
  entity_id    uuid        NOT NULL,
  file_name    text        NOT NULL,
  file_size    bigint,
  mime_type    text,
  storage_path text        NOT NULL,
  uploaded_by  uuid        REFERENCES auth.users,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id, created_at DESC);

-- ── 8. CLIENT PORTAL / DEAL ROOM ────────────────────────────
CREATE TABLE IF NOT EXISTS deal_portal_tokens (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id    uuid        NOT NULL,
  company_id uuid        REFERENCES companies(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_by uuid        REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_token ON deal_portal_tokens(token);

CREATE TABLE IF NOT EXISTS deal_portal_events (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id   uuid        REFERENCES deal_portal_tokens(id) ON DELETE CASCADE,
  event_type text        NOT NULL, -- 'viewed'|'signed'|'accepted'|'commented'
  client_ip  inet,
  signature  text,
  comment    text,
  created_at timestamptz DEFAULT now()
);

-- ── 9. RLS POLICIES ─────────────────────────────────────────
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all new tables
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sequences','sequence_steps','sequence_enrollments',
    'products','deal_products','sales_goals','documents',
    'deal_portal_tokens','deal_portal_events','team_invites'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "service_role_%s" ON %I FOR ALL USING (auth.role() = ''service_role'')', t, t);
  END LOOP;
END $$;

-- ── 10. PERFORMANCE INDEXES ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON leads(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_company_stage ON deals(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_interactions_entity ON interactions(company_id, lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_company_date ON audit_logs(company_id, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sequences;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

SELECT 'Phase 11-20 enterprise migration complete ✓' AS status;
