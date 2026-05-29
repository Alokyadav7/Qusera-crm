-- ============================================================
-- Qwix CRM — Invoices System
-- Run in: Supabase SQL Editor
-- ============================================================

-- Main invoices table
CREATE TABLE IF NOT EXISTS crm_invoices (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      uuid          REFERENCES companies(id) ON DELETE CASCADE,
  created_by      uuid          REFERENCES auth.users ON DELETE SET NULL,
  contact_id      uuid,         -- soft ref to contacts
  deal_id         uuid,         -- soft ref to deals (optional)
  invoice_number  text          NOT NULL,
  status          text          NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  currency        text          NOT NULL DEFAULT 'INR',
  subtotal        numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,2)  NOT NULL DEFAULT 18,  -- GST %
  tax_amount      numeric(14,2) GENERATED ALWAYS AS (ROUND(subtotal * tax_rate / 100, 2)) STORED,
  total           numeric(14,2) GENERATED ALWAYS AS (ROUND(subtotal + subtotal * tax_rate / 100, 2)) STORED,
  due_date        date,
  paid_at         timestamptz,
  notes           text,
  terms           text,
  created_at      timestamptz   DEFAULT now(),
  updated_at      timestamptz   DEFAULT now()
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS crm_invoice_items (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id  uuid          NOT NULL REFERENCES crm_invoices(id) ON DELETE CASCADE,
  description text          NOT NULL,
  quantity    numeric(10,3) NOT NULL DEFAULT 1,
  unit_price  numeric(14,2) NOT NULL DEFAULT 0,
  amount      numeric(14,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
  created_at  timestamptz   DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_invoices_company ON crm_invoices(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_status  ON crm_invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_invoice_items    ON crm_invoice_items(invoice_id);

-- RLS
ALTER TABLE crm_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_company_access" ON crm_invoices;
CREATE POLICY "invoice_company_access" ON crm_invoices FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "invoice_service_role" ON crm_invoices;
CREATE POLICY "invoice_service_role" ON crm_invoices FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "invoice_items_access" ON crm_invoice_items;
CREATE POLICY "invoice_items_access" ON crm_invoice_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM crm_invoices WHERE company_id IN (
        SELECT company_id FROM user_active_company WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "invoice_items_service" ON crm_invoice_items;
CREATE POLICY "invoice_items_service" ON crm_invoice_items FOR ALL
  USING (auth.role() = 'service_role');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE crm_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE crm_invoice_items;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_invoice_updated_at ON crm_invoices;
CREATE TRIGGER trig_invoice_updated_at
  BEFORE UPDATE ON crm_invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoice_timestamp();

-- Auto-overdue: mark sent invoices past due_date as overdue
CREATE OR REPLACE FUNCTION auto_mark_overdue()
RETURNS void AS $$
BEGIN
  UPDATE crm_invoices
  SET status = 'overdue'
  WHERE status = 'sent' AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Invoices migration complete ✓' AS status;
