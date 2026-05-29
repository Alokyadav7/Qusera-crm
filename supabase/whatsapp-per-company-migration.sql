-- ============================================================
-- Klinq CRM — WhatsApp Per-Company Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Per-company WhatsApp connection config
CREATE TABLE IF NOT EXISTS company_whatsapp (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id        uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  waba_id           varchar NOT NULL,
  phone_number_id   varchar NOT NULL,
  phone_number      varchar NOT NULL,
  display_name      varchar,
  access_token      text NOT NULL,
  token_expires_at  timestamptz,
  is_active         boolean DEFAULT true,
  quality_rating    varchar DEFAULT 'GREEN',
  connected_at      timestamptz DEFAULT NOW(),
  updated_at        timestamptz DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_phone_number_id
  ON company_whatsapp(phone_number_id);

ALTER TABLE company_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_company_isolation" ON company_whatsapp;
CREATE POLICY "wa_company_isolation" ON company_whatsapp
  USING (company_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- 2. Upgrade whatsapp_messages to proper schema
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id       uuid NOT NULL REFERENCES companies(id),
  lead_id          uuid,
  phone_number_id  varchar NOT NULL,
  wa_message_id    varchar UNIQUE,
  direction        varchar CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  from_number      varchar NOT NULL,
  to_number        varchar NOT NULL,
  message_text     text,
  message_type     varchar DEFAULT 'text',
  media_url        varchar,
  status           varchar DEFAULT 'sent',
  error_message    text,
  received_at      timestamptz,
  delivered_at     timestamptz,
  read_at          timestamptz,
  created_at       timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_company_lead
  ON whatsapp_messages(company_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_number_id
  ON whatsapp_messages(phone_number_id);

CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id
  ON whatsapp_messages(wa_message_id);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_messages_isolation" ON whatsapp_messages;
CREATE POLICY "wa_messages_isolation" ON whatsapp_messages
  USING (company_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- 3. Add lead reference constraint only if leads table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    BEGIN
      ALTER TABLE whatsapp_messages
        ADD CONSTRAINT fk_wa_messages_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
