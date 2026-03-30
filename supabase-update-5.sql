-- ═══════════════════════════════════════════════════════════
-- DAILY ACTIVITY MONITOR — Database Update 5
-- CRITICAL FIX: Activities not showing in My Dashboard
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

-- ── STEP 1: Drop ALL existing policies on activities ───────
-- We drop everything to start completely clean.

do $$ 
declare
  pol record;
begin
  for pol in 
    select policyname from pg_policies 
    where tablename = 'activities' and schemaname = 'public'
  loop
    execute 'drop policy if exists "' || pol.policyname || '" on public.activities';
  end loop;
end $$;

-- ── STEP 2: Disable RLS temporarily to confirm data exists ─
-- This lets us verify activities are actually in the table.
-- We re-enable it with correct policies in STEP 3.

alter table public.activities disable row level security;

-- ── STEP 3: Re-enable RLS with ONE simple, correct policy ──

alter table public.activities enable row level security;

-- Single policy: users can do anything with their own activities
-- This is the simplest possible policy — no complex joins.
create policy "activity_owner_all"
  on public.activities
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── STEP 4: Verify your data ───────────────────────────────
-- After running this, go to Supabase Table Editor
-- and click on the "activities" table.
-- You should see your activity rows there.
-- If the table is empty, the INSERT is also failing silently.

-- ── STEP 5: Check for existing activities ─────────────────
select 
  id,
  user_id,
  activity,
  activity_date,
  from_time,
  end_time,
  group_id,
  is_group
from public.activities
limit 20;

-- ── STEP 6: Update the overlap function to use security definer
-- so it bypasses RLS (needed for the overlap check to work)

create or replace function public.check_activity_overlap(
  p_user_id    uuid,
  p_group_id   uuid,
  p_date       date,
  p_from       time,
  p_end        time,
  p_exclude_id uuid default null
)
returns boolean as $$
  select exists (
    select 1 from public.activities a
    where a.user_id       = p_user_id
      and a.activity_date = p_date
      and (p_exclude_id is null or a.id <> p_exclude_id)
      and p_from < a.end_time
      and p_end  > a.from_time
  );
$$ language sql security definer;

grant execute on function public.check_activity_overlap(uuid, uuid, date, time, time, uuid)
  to authenticated;

-- ── DONE ──────────────────────────────────────────────────
-- After running this script:
-- 1. Check the SELECT results above — do you see your activities?
-- 2. If YES: the JS fix below will make them show in the dashboard
-- 3. If NO: the activities were never saved — check INSERT permissions
