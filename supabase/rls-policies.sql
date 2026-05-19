-- ============================================================
-- OrbitCRM — Supabase Row Level Security (RLS) Policies
-- Run this ONCE in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/eqllqrppeodrhalpiajx/sql
-- ============================================================

-- ── 1. LEADS ────────────────────────────────────────────────
alter table leads enable row level security;

drop policy if exists "Users can view own leads" on leads;
drop policy if exists "Users can insert own leads" on leads;
drop policy if exists "Users can update own leads" on leads;
drop policy if exists "Users can delete own leads" on leads;

create policy "Users can view own leads"
  on leads for select
  using (auth.uid() = user_id);

create policy "Users can insert own leads"
  on leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leads"
  on leads for update
  using (auth.uid() = user_id);

create policy "Users can delete own leads"
  on leads for delete
  using (auth.uid() = user_id);

-- ── 2. INTERACTIONS ─────────────────────────────────────────
alter table interactions enable row level security;

drop policy if exists "Users can view own interactions" on interactions;
drop policy if exists "Users can insert own interactions" on interactions;
drop policy if exists "Users can update own interactions" on interactions;

create policy "Users can view own interactions"
  on interactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own interactions"
  on interactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own interactions"
  on interactions for update
  using (auth.uid() = user_id);

-- ── 3. TASKS ────────────────────────────────────────────────
alter table tasks enable row level security;

drop policy if exists "Users can view own tasks" on tasks;
drop policy if exists "Users can insert own tasks" on tasks;
drop policy if exists "Users can update own tasks" on tasks;
drop policy if exists "Users can delete own tasks" on tasks;

create policy "Users can view own tasks"
  on tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on tasks for delete
  using (auth.uid() = user_id);

-- ── 4. PROFILES ─────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  company_name text,
  industry text,
  team_size text,
  phone text,
  website text,
  currency text default 'INR',
  role text default 'owner',
  onboarding_completed boolean default false,
  email_notifications boolean default true,
  whatsapp_notifications boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ── 5. Auto-create profile on signup ────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 6. Notifications table ───────────────────────────────────
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null default 'system',
  priority text not null default 'medium',
  title text not null,
  body text,
  read boolean default false,
  is_read boolean default false,
  action_label text,
  action_href text,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;
drop policy if exists "Users can delete own notifications" on notifications;

create policy "Users can view own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on notifications for delete
  using (auth.uid() = user_id);

-- ── 7. Enable Realtime on all tables ────────────────────────
-- IMPORTANT: Run this in Supabase Dashboard → Database → SQL Editor
-- This enables real-time subscriptions for all CRM tables
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table interactions;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table notifications;

-- ── 8. Add missing updated_at to tasks ────────────────────────
alter table tasks add column if not exists updated_at timestamptz default now();
alter table leads add column if not exists updated_at timestamptz default now();
alter table interactions add column if not exists updated_at timestamptz default now();

-- ── 9. Migrate notifications.read → is_read (if needed) ────────
-- Only run this if you have existing data with the 'read' column:
-- ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
-- If the table is new, the is_read column is already created above.

select 'RLS policies applied successfully!' as status;
