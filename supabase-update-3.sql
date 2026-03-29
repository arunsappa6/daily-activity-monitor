-- ═══════════════════════════════════════════════════════════
-- DAILY ACTIVITY MONITOR — Database Update 3
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Adds: date_period, profile_status, profile_type to profiles
-- ═══════════════════════════════════════════════════════════

-- ── 1. Add new columns to profiles table ─────────────────
-- Safe to run even if columns already exist (IF NOT EXISTS)

alter table public.profiles
  add column if not exists date_period    timestamptz,
  add column if not exists profile_status text default 'Active',
  add column if not exists profile_type   text default 'New Customer';

-- ── 2. Backfill existing rows ─────────────────────────────
-- Sets values for any existing profiles that don't have them yet

update public.profiles
set
  date_period    = coalesce(date_period, created_at, now()),
  profile_status = coalesce(profile_status, 'Active'),
  profile_type   = coalesce(profile_type, 'New Customer')
where profile_status is null or date_period is null;

-- ── 3. Update the handle_new_user trigger ─────────────────
-- Adds the three new fields when a new user registers

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
    postal_code,
    date_period,
    profile_status,
    profile_type
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
    new.raw_user_meta_data->>'postal_code',
    now(),          -- date_period = registration timestamp
    'Active',       -- profile_status
    'New Customer'  -- profile_type
  );
  return new;
end;
$$ language plpgsql security definer;

-- Re-attach trigger (drop + create is safe — it replaces if exists)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 4. Function to soft-close a profile on deletion ───────
-- Called from manage-profile.js BEFORE deleting the auth user.
-- Updates the profile row to Closed / Past Customer status.

create or replace function public.close_profile_before_delete()
returns void as $$
begin
  update public.profiles
  set
    date_period    = now(),
    profile_status = 'Closed',
    profile_type   = 'Past Customer'
  where id = auth.uid();
end;
$$ language plpgsql security definer;

-- Allow authenticated users to call it
revoke all on function public.close_profile_before_delete() from public;
grant execute on function public.close_profile_before_delete() to authenticated;

-- ── 5. RLS: allow selecting profile_status for email check ─
-- The registration page needs to query profiles by email to check
-- if a customer already exists. We expose a secure function for this.

create or replace function public.check_email_exists(p_email text)
returns table(profile_status text, profile_type text) as $$
  select p.profile_status, p.profile_type
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(p_email)
  limit 1;
$$ language sql security definer;

-- Allow anyone (including anonymous / unregistered) to call this
-- It only returns status fields, not personal data — safe to expose
revoke all on function public.check_email_exists(text) from public;
grant execute on function public.check_email_exists(text) to anon, authenticated;

-- ── Done ──────────────────────────────────────────────────
-- After running this SQL:
-- • New registrations auto-populate date_period, profile_status, profile_type
-- • Profile deletion marks status as Closed / Past Customer before removing
-- • Registration page can check email existence via check_email_exists()
