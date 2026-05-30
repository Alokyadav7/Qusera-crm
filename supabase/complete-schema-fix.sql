
CREATE TABLE IF NOT EXISTS companies (
  id                       uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                     text        NOT NULL,
  slug                     text        NOT NULL UNIQUE,
  owner_id                 uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status                   text        NOT NULL DEFAULT 'trial'
                                       CHECK (status IN ('trial','active','suspended','canceled','deleted')),
  logo_url                 text,
  primary_color            text        DEFAULT '#18181b',
  timezone                 text        DEFAULT 'Asia/Kolkata',
  currency                 text        DEFAULT 'INR',
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  deleted_at               timestamptz,
  deleted_by               uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add every column the code uses (all safe with IF NOT EXISTS)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry             text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count       text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan                 text DEFAULT 'basic';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id              text DEFAULT 'basic';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active            boolean DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_complete       boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_step           integer DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspension_reason    text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand_color          varchar(7) DEFAULT '#18181b';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gstin                text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address              text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_email        text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website              text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at        timestamptz DEFAULT (now() + interval '14 days');
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at           timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at           timestamptz DEFAULT now();

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_companies" ON companies;
CREATE POLICY "service_role_full_companies" ON companies FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "members_can_read_own_company" ON companies;
CREATE POLICY "members_can_read_own_company" ON companies FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true AND deleted_at IS NULL
    )
  );

-- ── STEP 2: PLATFORM ADMINS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    uuid    REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  granted_by uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  is_active  boolean DEFAULT true,
  notes      text
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_platform_admins" ON platform_admins;
CREATE POLICY "service_role_manage_platform_admins" ON platform_admins FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 3: PROFILES (FK to companies — companies must exist first) ──

-- profiles table is created by Supabase auth, we only ADD columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name            text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email                text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone                text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active            boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin       boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temp_password_used   boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at        timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joined_at            timestamptz DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at           timestamptz DEFAULT now();
-- company_id FK added last, after companies is guaranteed to exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id           uuid REFERENCES companies(id) ON DELETE SET NULL;

-- ── STEP 4: COMPANY MEMBERS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS company_members (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id        uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role           text        NOT NULL DEFAULT 'sales',
  department     text,
  is_active      boolean     DEFAULT true,
  workspace_ids  uuid[]      DEFAULT '{}',
  invited_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at     timestamptz,
  joined_at      timestamptz DEFAULT now(),
  last_active_at timestamptz,
  deleted_at     timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (company_id, user_id)
);

ALTER TABLE company_members ADD COLUMN IF NOT EXISTS department  text;
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_members" ON company_members;
CREATE POLICY "service_role_full_members" ON company_members FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "members_can_read_same_company_members" ON company_members;
CREATE POLICY "members_can_read_same_company_members" ON company_members FOR SELECT
  USING (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      WHERE cm.user_id = auth.uid() AND cm.is_active = true AND cm.deleted_at IS NULL
    )
  );

-- ── STEP 5: USER ACTIVE COMPANY ───────────────────────────────

CREATE TABLE IF NOT EXISTS user_active_company (
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id   uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid,
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE user_active_company ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_active_company" ON user_active_company;
CREATE POLICY "users_manage_own_active_company" ON user_active_company FOR ALL
  USING (user_id = auth.uid());

-- ── STEP 6: AUDIT LOGS ────────────────────────────────────────
-- Code inserts: action, resource, user_id, company_id, details
-- Original schema had: entity_type, old_value, new_value
-- We add BOTH sets of columns so nothing breaks

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        REFERENCES companies(id) ON DELETE SET NULL,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  text,
  action      text        NOT NULL,
  resource    text,
  entity_type text,
  entity_id   uuid,
  details     jsonb,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource    text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details     jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email  text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id   uuid;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value   jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value   jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address  text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_audit_logs" ON audit_logs;
CREATE POLICY "service_role_audit_logs" ON audit_logs FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admins_view_audit_logs" ON audit_logs;
CREATE POLICY "admins_view_audit_logs" ON audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
    )
  );

-- ── STEP 7: PLATFORM SETTINGS (singleton) ─────────────────────

CREATE TABLE IF NOT EXISTS platform_settings (
  id                   integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_name        text        DEFAULT 'Klinq CRM',
  platform_logo_url    text,
  support_email        text        DEFAULT 'klinqcrm@gmail.com',
  support_phone        text        DEFAULT '8603058090',
  default_sender_name  text        DEFAULT 'Klinq CRM',
  default_sender_email text        DEFAULT 'klinqcrm@gmail.com',
  daily_sms_limit      integer     DEFAULT 500,
  daily_whatsapp_limit integer     DEFAULT 200,
  daily_email_limit    integer     DEFAULT 1000,
  maintenance_mode     boolean     DEFAULT false,
  updated_at           timestamptz DEFAULT now(),
  updated_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_platform_settings" ON platform_settings;
CREATE POLICY "service_role_full_access_platform_settings" ON platform_settings FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 8: IMPERSONATION SESSIONS ───────────────────────────

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  target_company_id uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  target_user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reason            text        NOT NULL,
  actions_taken     jsonb[]     DEFAULT '{}',
  ip_address        text,
  user_agent        text,
  started_at        timestamptz DEFAULT now(),
  ended_at          timestamptz,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_impersonation" ON impersonation_sessions;
CREATE POLICY "service_role_manage_impersonation" ON impersonation_sessions FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "super_admins_read_own_sessions" ON impersonation_sessions;
CREATE POLICY "super_admins_read_own_sessions" ON impersonation_sessions FOR SELECT
  USING (super_admin_id = auth.uid());

-- ── STEP 9: ACTIVITY EVENTS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_events (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     uuid        REFERENCES companies(id) ON DELETE CASCADE,
  workspace_id   uuid,
  actor_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type     text        NOT NULL DEFAULT 'user',
  event_type     text        NOT NULL,
  resource_type  text,
  resource_id    uuid,
  resource_label text,
  metadata       jsonb       DEFAULT '{}',
  ip_address     text,
  user_agent     text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_events" ON activity_events;
CREATE POLICY "service_role_full_events" ON activity_events FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "members_read_company_events" ON activity_events;
CREATE POLICY "members_read_company_events" ON activity_events FOR SELECT
  USING (
    company_id IS NULL
    OR company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- ── STEP 10: COMPANY FEATURE OVERRIDES ───────────────────────

CREATE TABLE IF NOT EXISTS company_feature_overrides (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  feature_key text        NOT NULL,
  is_enabled  boolean     NOT NULL DEFAULT false,
  reason      text,
  enabled_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (company_id, feature_key)
);

ALTER TABLE company_feature_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_overrides" ON company_feature_overrides;
CREATE POLICY "service_role_manage_overrides" ON company_feature_overrides FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 11: AUTH RATE LIMITS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier   text        NOT NULL,
  action       text        NOT NULL,
  attempts     integer     DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  UNIQUE (identifier, action)
);

ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_rate_limits" ON auth_rate_limits;
CREATE POLICY "service_role_full_access_rate_limits" ON auth_rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 12: COMPANY INVITES ──────────────────────────────────

CREATE TABLE IF NOT EXISTS company_invites (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    uuid        REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  invited_email text        NOT NULL,
  role          text        NOT NULL DEFAULT 'sales',
  invited_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  token         text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_company_invites" ON company_invites;
CREATE POLICY "service_role_full_access_company_invites" ON company_invites FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 13: SUBSCRIPTIONS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id         uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid          REFERENCES companies(id) ON DELETE CASCADE,
  plan_id    text,
  status     text          DEFAULT 'active',
  mrr        numeric(10,2) DEFAULT 0,
  starts_at  timestamptz   DEFAULT now(),
  ends_at    timestamptz,
  created_at timestamptz   DEFAULT now(),
  updated_at timestamptz   DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_subscriptions" ON subscriptions;
CREATE POLICY "service_role_full_subscriptions" ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 14: JOB QUEUE ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_queue (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid        REFERENCES companies(id) ON DELETE CASCADE,
  job_type     text        NOT NULL,
  status       text        DEFAULT 'pending',
  payload      jsonb       DEFAULT '{}',
  attempts     integer     DEFAULT 0,
  error        text,
  scheduled_at timestamptz DEFAULT now(),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_job_queue" ON job_queue;
CREATE POLICY "service_role_full_job_queue" ON job_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 15: NOTIFICATIONS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       text        NOT NULL,
  body        text,
  entity_type text,
  entity_id   uuid,
  read        boolean     DEFAULT false NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Patch existing notifications table if columns are missing
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id  uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body        text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id   uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read        boolean DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_notifications" ON notifications;
CREATE POLICY "users_own_notifications" ON notifications FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_notifications" ON notifications;
CREATE POLICY "service_role_notifications" ON notifications FOR ALL
  USING (auth.role() = 'service_role');

-- ── STEP 16: GRANT SUPER ADMIN ────────────────────────────────
-- Update to your actual super admin email if different

DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users
  WHERE email = 'klinqcrm@gmail.com' LIMIT 1;

  IF v_uid IS NOT NULL THEN
    UPDATE profiles
    SET is_super_admin = true, is_active = true, onboarding_completed = true
    WHERE id = v_uid;

    INSERT INTO platform_admins (user_id, is_active)
    VALUES (v_uid, true)
    ON CONFLICT (user_id) DO UPDATE SET is_active = true;
  END IF;
END $$;

-- ── STEP 17: INDEXES (all columns guaranteed to exist now) ────

CREATE INDEX IF NOT EXISTS idx_companies_slug          ON companies(slug)          WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_status        ON companies(status)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_is_active     ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id     ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin    ON profiles(is_super_admin) WHERE is_super_admin = true;
CREATE INDEX IF NOT EXISTS idx_members_company         ON company_members(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_user            ON company_members(user_id)    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_audit_company           ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action            ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_company          ON activity_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type             ON activity_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_admin     ON impersonation_sessions(super_admin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_company   ON impersonation_sessions(target_company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_overrides_company       ON company_feature_overrides(company_id);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_id     ON auth_rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_queue_status        ON job_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_platform_admins_user    ON platform_admins(user_id) WHERE is_active = true;

-- ── STEP 18: RELOAD SCHEMA CACHE ─────────────────────────────
NOTIFY pgrst, 'reload schema';

SELECT 'Klinq CRM — complete schema fix applied successfully' AS status;
