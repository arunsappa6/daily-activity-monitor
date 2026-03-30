-- ═══════════════════════════════════════════════════════════
-- DAILY ACTIVITY MONITOR — Database Update 4
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Fixes: personal activities visibility + overlap prevention
-- ═══════════════════════════════════════════════════════════

-- ── 1. Drop and recreate activities RLS policies ──────────
-- The original policy was too strict with the NULL check.
-- These new policies are cleaner and more reliable.

drop policy if exists "Users can view own activities"    on public.activities;
drop policy if exists "Users can insert own activities"  on public.activities;
drop policy if exists "Users can update own activities"  on public.activities;
drop policy if exists "Users can delete own activities"  on public.activities;
drop policy if exists "Group members can view group activities" on public.activities;

-- Personal activities: user owns them (group_id may be null OR set)
create policy "Users select own activities"
  on public.activities for select
  using (auth.uid() = user_id);

create policy "Users insert own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

create policy "Users update own activities"
  on public.activities for update
  using (auth.uid() = user_id);

create policy "Users delete own activities"
  on public.activities for delete
  using (auth.uid() = user_id);

-- Group activities: group creator and accepted members can view
create policy "Group members select group activities"
  on public.activities for select
  using (
    group_id is not null and (
      auth.uid() = user_id
      or exists (
        select 1 from public.groups g
        where g.id = activities.group_id
          and g.created_by = auth.uid()
      )
      or exists (
        select 1 from public.group_join_requests r
        where r.group_id  = activities.group_id
          and r.email      = (select email from auth.users where id = auth.uid())
          and r.status     = 'accepted'
      )
    )
  );

-- ── 2. Function: check time overlap before insert ─────────
-- Returns TRUE if the given time slot conflicts with an
-- existing activity for the same user on the same date.

create or replace function public.check_activity_overlap(
  p_user_id      uuid,
  p_group_id     uuid,
  p_date         date,
  p_from         time,
  p_end          time,
  p_exclude_id   uuid default null   -- for future edit support
)
returns boolean as $$
  select exists (
    select 1
    from public.activities a
    where a.user_id       = p_user_id
      and a.activity_date = p_date
      and (p_group_id is null and a.group_id is null
           or p_group_id is not null and a.group_id = p_group_id)
      and (p_exclude_id is null or a.id <> p_exclude_id)
      -- overlaps when: new_from < existing_end AND new_end > existing_from
      and p_from < a.end_time
      and p_end  > a.from_time
  );
$$ language sql security definer;

grant execute on function public.check_activity_overlap(uuid, uuid, date, time, time, uuid)
  to authenticated;

-- ── 3. Fix any existing rows where group_id is empty string
update public.activities
set group_id = null
where group_id::text = '';

-- ── Done ──────────────────────────────────────────────────
-- After running this:
-- • Personal activities are visible in My Dashboard
-- • Overlap check available via check_activity_overlap() RPC
-- • Stale empty-string group_id rows are cleaned up
