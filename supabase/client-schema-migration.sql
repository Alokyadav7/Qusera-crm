-- ============================================================
-- OrbitCRM — Client Schema Migration
-- Adds: clients, client_addresses, client_contacts, roles, user_roles
-- Run once in: https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql
-- ============================================================

-- ── 1. CLIENTS ─────────────────────────────────────────────────────────────────
-- Represents a company/business being managed in the CRM
-- (coexists with leads table — leads=prospects, clients=active accounts)
CREATE TABLE IF NOT EXISTS clients (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name             text        NOT NULL,
  industry         text,
  website          text,
  gstin            text,
  pan_number       text,
  gst_status       text        DEFAULT 'pending' CHECK (gst_status IN ('pending','verified','invalid')),
  pan_status       text        DEFAULT 'pending' CHECK (pan_status IN ('pending','verified','invalid')),
  source           text        DEFAULT 'manual',
  status           text        DEFAULT 'new'
                               CHECK (status IN ('new','contacted','interested','verified','negotiation','closed_won','closed_lost')),
  buying_intent    text        DEFAULT 'medium' CHECK (buying_intent IN ('high','medium','low')),
  sentiment_score  numeric     DEFAULT 0,
  deal_value       numeric,
  estimated_budget numeric,
  ai_summary       text,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── 2. CLIENT_CONTACTS ─────────────────────────────────────────────────────────
-- Individual people at a client company
CREATE TABLE IF NOT EXISTS client_contacts (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           uuid        REFERENCES clients ON DELETE CASCADE NOT NULL,
  full_name           text        NOT NULL,
  designation         text,
  phone_number        text,
  email               text,
  preferred_language  text        DEFAULT 'en',
  is_primary          boolean     DEFAULT false,
  last_contacted_at   timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ── 3. CLIENT_ADDRESSES ────────────────────────────────────────────────────────
-- Multiple addresses per client; optionally linked to a specific contact
CREATE TABLE IF NOT EXISTS client_addresses (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           uuid        REFERENCES clients ON DELETE CASCADE NOT NULL,
  client_contact_id   uuid        REFERENCES client_contacts ON DELETE SET NULL,
  address_type        text        DEFAULT 'billing' CHECK (address_type IN ('billing','shipping','office','registered')),
  address_line1       text,
  address_line2       text,
  city                text,
  state               text,
  pincode             text,
  country             text        DEFAULT 'India',
  is_primary          boolean     DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

-- ── 4. ROLES ───────────────────────────────────────────────────────────────────
-- Named permission sets; client_id=NULL means system-wide role
CREATE TABLE IF NOT EXISTS roles (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   uuid    REFERENCES clients ON DELETE CASCADE,  -- NULL = system role
  name        text    NOT NULL,
  description text,
  permissions jsonb   DEFAULT '{}',
  is_system   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (client_id, name)
);

-- ── 5. USER_ROLES ──────────────────────────────────────────────────────────────
-- Junction: which user has which role
CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role_id     uuid        REFERENCES roles ON DELETE CASCADE NOT NULL,
  assigned_by uuid        REFERENCES auth.users ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role_id)
);

-- ── 6. SEED SYSTEM ROLES ───────────────────────────────────────────────────────
INSERT INTO roles (name, description, is_system, permissions) VALUES
  ('super_admin', 'Full system access — all features and settings',   true,
   '{"all": true, "manage_users": true, "manage_roles": true, "delete_leads": true, "view_audit": true, "manage_clients": true, "view_all_data": true}'),
  ('admin',       'Manage users and all CRM data',                    true,
   '{"manage_users": true, "delete_leads": true, "view_audit": true, "manage_clients": true, "view_all_data": true}'),
  ('manager',     'View all team data, assign tasks, see analytics',  true,
   '{"view_all_leads": true, "assign_tasks": true, "view_audit": false, "manage_clients": true}'),
  ('sales_rep',   'Manage own leads, tasks, and interactions',        true,
   '{"own_leads": true, "own_tasks": true, "log_interactions": true}'),
  ('viewer',      'Read-only access across the CRM',                  true,
   '{"read_only": true}')
ON CONFLICT (client_id, name) DO NOTHING;

-- ── 7. ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles       ENABLE ROW LEVEL SECURITY;

-- Clients: users manage their own
DROP POLICY IF EXISTS "Users manage own clients" ON clients;
CREATE POLICY "Users manage own clients"
  ON clients FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Client contacts: visible if you own the parent client
DROP POLICY IF EXISTS "Users manage own client contacts" ON client_contacts;
CREATE POLICY "Users manage own client contacts"
  ON client_contacts FOR ALL
  USING  (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_contacts.client_id AND clients.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_contacts.client_id AND clients.user_id = auth.uid()));

-- Client addresses: same as contacts
DROP POLICY IF EXISTS "Users manage own client addresses" ON client_addresses;
CREATE POLICY "Users manage own client addresses"
  ON client_addresses FOR ALL
  USING  (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_addresses.client_id AND clients.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_addresses.client_id AND clients.user_id = auth.uid()));

-- Roles: everyone can read system roles
DROP POLICY IF EXISTS "Anyone can read system roles" ON roles;
CREATE POLICY "Anyone can read system roles"
  ON roles FOR SELECT
  USING (is_system = true OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Roles: only admins can insert/update/delete (handled by service role in admin panel)
DROP POLICY IF EXISTS "Service role manages roles" ON roles;
CREATE POLICY "Service role manages roles"
  ON roles FOR ALL
  USING (auth.role() = 'service_role');

-- User roles: user can see their own; admins use service role
DROP POLICY IF EXISTS "Users view own roles" ON user_roles;
CREATE POLICY "Users view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages user roles" ON user_roles;
CREATE POLICY "Service role manages user roles"
  ON user_roles FOR ALL
  USING (auth.role() = 'service_role');

-- ── 8. REALTIME ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE client_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE client_addresses;
ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;

-- ── 9. ASSIGN SUPER_ADMIN TO FIRST USER ────────────────────────────────────────
-- Auto-assigns super_admin to the earliest registered user (you)
-- Safe to re-run — uses ON CONFLICT DO NOTHING
WITH first_user AS (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
),
super_admin_role AS (
  SELECT id FROM roles WHERE name = 'super_admin' AND is_system = true LIMIT 1
)
INSERT INTO user_roles (user_id, role_id)
SELECT fu.id, sar.id
FROM first_user fu, super_admin_role sar
ON CONFLICT DO NOTHING;

-- ── 10. REFRESH SCHEMA CACHE ────────────────────────────────────────────────────
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'OrbitCRM client schema migration complete!' AS status;
