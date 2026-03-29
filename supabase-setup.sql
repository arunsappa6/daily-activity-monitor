-- ═══════════════════════════════════════════════════════════
-- DAILY ACTIVITY MONITOR — Database Setup
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

-- ── 1. PROFILES table ────────────────────────────────────
-- Stores extra user info not held by Supabase Auth
-- (Auth handles email, password, verification automatically)

create table if not exists public.profiles (
  id             uuid references auth.users(id) on delete cascade primary key,
  first_name     text not null,
  last_name      text not null,
  date_of_birth  date not null,
  phone          text,
  apt_unit       text,
  street_number  text,
  street_name    text,
  province       text,
  country        text,
  postal_code    text,
  is_admin       boolean default false,
  created_at     timestamptz default now()
);

-- ── 2. GROUPS table ──────────────────────────────────────

create table if not exists public.groups (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  created_by   uuid references auth.users(id) on delete set null,
  admin_name   text,
  created_at   timestamptz default now()
);

-- ── 3. GROUP_MEMBERS table ───────────────────────────────

create table if not exists public.group_members (
  id             uuid default gen_random_uuid() primary key,
  group_id       uuid references public.groups(id) on delete cascade,
  first_name     text not null,
  last_name      text not null,
  phone          text,
  email          text,
  relationship   text,
  added_at       timestamptz default now()
);

-- ── 4. Enable Row Level Security (RLS) on all tables ─────
-- RLS ensures users can only see and modify their own data.

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- ── 5. RLS Policies — profiles ───────────────────────────

-- Users can only read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can insert their own profile on registration
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── 6. RLS Policies — groups ─────────────────────────────

-- Users can see groups they created
create policy "Users can view own groups"
  on public.groups for select
  using (auth.uid() = created_by);

-- Users can create groups
create policy "Users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- Group creators can update their own groups
create policy "Creators can update own groups"
  on public.groups for update
  using (auth.uid() = created_by);

-- Group creators can delete their own groups
create policy "Creators can delete own groups"
  on public.groups for delete
  using (auth.uid() = created_by);

-- ── 7. RLS Policies — group_members ──────────────────────

-- Only the group creator can see members of their groups
create policy "Group creator can view members"
  on public.group_members for select
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.created_by = auth.uid()
    )
  );

-- Group creator can add members
create policy "Group creator can add members"
  on public.group_members for insert
  with check (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.created_by = auth.uid()
    )
  );

-- Group creator can remove members
create policy "Group creator can delete members"
  on public.group_members for delete
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.created_by = auth.uid()
    )
  );

-- ── 8. Auto-create profile row when user signs up ─────────
-- This trigger runs automatically after a new Auth user is created.
-- It copies the metadata (first_name, last_name etc.) saved
-- during registration into the profiles table.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    date_of_birth,
    phone,
    apt_unit,
    street_number,
    street_name,
    province,
    country,
    postal_code
  ) values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    (new.raw_user_meta_data->>'date_of_birth')::date,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'apt_unit',
    new.raw_user_meta_data->>'street_number',
    new.raw_user_meta_data->>'street_name',
    new.raw_user_meta_data->>'province',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'postal_code'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Attach the trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Done! ─────────────────────────────────────────────────
-- Your database is ready. Return to your site and test
-- registration — the profile row will be created automatically.
