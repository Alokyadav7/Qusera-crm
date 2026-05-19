-- ============================================================
-- OrbitCRM — Add GST/PAN columns to leads table
-- Run this in Supabase SQL Editor ONCE:
-- https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql
-- ============================================================

alter table leads
  add column if not exists gstin text,
  add column if not exists gst_status text default 'pending',
  add column if not exists pan_number text,
  add column if not exists pan_status text default 'pending';

-- Optional: index for compliance search
create index if not exists leads_gstin_idx on leads(gstin);
create index if not exists leads_pan_idx on leads(pan_number);
