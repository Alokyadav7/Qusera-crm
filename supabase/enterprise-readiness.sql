-- ============================================================
-- OrbitCRM Enterprise Readiness: RBAC, audit logs, customer success
-- Run in Supabase SQL Editor after the base migrations.
-- ============================================================

create table if not exists organizations (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  default_currency text default 'INR',
  default_language text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references organizations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'sales_rep',
  territory text,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (organization_id, user_id)
);

create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz default now()
);

create table if not exists customer_health_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lead_id uuid references leads on delete cascade not null,
  health_score integer not null check (health_score between 0 and 100),
  risk_level text not null default 'watch',
  reasons text[] default '{}',
  next_best_action text,
  created_at timestamptz default now()
);

create table if not exists renewal_opportunities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lead_id uuid references leads on delete cascade not null,
  renewal_date date,
  expected_value numeric,
  status text default 'open',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table organizations enable row level security;
alter table team_members enable row level security;
alter table audit_logs enable row level security;
alter table customer_health_snapshots enable row level security;
alter table renewal_opportunities enable row level security;

drop policy if exists "Users manage owned organizations" on organizations;
create policy "Users manage owned organizations"
  on organizations for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users view own team membership" on team_members;
create policy "Users view own team membership"
  on team_members for select
  using (auth.uid() = user_id);

drop policy if exists "Users view own audit logs" on audit_logs;
create policy "Users view own audit logs"
  on audit_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users manage own health snapshots" on customer_health_snapshots;
create policy "Users manage own health snapshots"
  on customer_health_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own renewal opportunities" on renewal_opportunities;
create policy "Users manage own renewal opportunities"
  on renewal_opportunities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.record_crm_audit_log()
returns trigger as $$
declare
  owner uuid;
begin
  owner := coalesce(new.user_id, old.user_id);

  insert into audit_logs (user_id, table_name, record_id, action, before_data, after_data)
  values (
    owner,
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists audit_leads_changes on leads;
create trigger audit_leads_changes
  after insert or update or delete on leads
  for each row execute procedure public.record_crm_audit_log();

drop trigger if exists audit_tasks_changes on tasks;
create trigger audit_tasks_changes
  after insert or update or delete on tasks
  for each row execute procedure public.record_crm_audit_log();

drop trigger if exists audit_interactions_changes on interactions;
create trigger audit_interactions_changes
  after insert or update or delete on interactions
  for each row execute procedure public.record_crm_audit_log();

alter publication supabase_realtime add table audit_logs;
alter publication supabase_realtime add table customer_health_snapshots;
alter publication supabase_realtime add table renewal_opportunities;

select 'Enterprise readiness migration complete' as status;
