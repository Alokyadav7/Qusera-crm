-- ── Demo OTP temp store ────────────────────────────────────────────────────────
create table if not exists demo_otps (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  otp        text not null,
  expires_at timestamptz not null,
  used       boolean default false,
  created_at timestamptz default now()
);

-- auto-clean expired OTPs (runs via index, no cron needed)
create index if not exists demo_otps_email_idx on demo_otps (email);
create index if not exists demo_otps_expires_idx on demo_otps (expires_at);

-- ── Demo / Trial requests ──────────────────────────────────────────────────────
create table if not exists demo_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text,
  company_name text,
  team_size    text,
  intent       text not null default 'demo',   -- 'demo' | 'trial'
  message      text,
  status       text not null default 'pending', -- 'pending' | 'contacted' | 'converted' | 'rejected'
  notes        text,                            -- internal super-admin notes
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists demo_requests_status_idx on demo_requests (status);
create index if not exists demo_requests_created_idx on demo_requests (created_at desc);

-- RLS: public can insert (via service role in API), only service role can read
alter table demo_requests enable row level security;
alter table demo_otps     enable row level security;

-- No public select — all access goes through service-role API routes
