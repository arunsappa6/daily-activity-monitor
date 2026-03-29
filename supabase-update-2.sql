-- ═══════════════════════════════════════════════════════════
-- DAILY ACTIVITY MONITOR — Database Update 2
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

-- ── 1. ACTIVITIES table (personal + group schedules) ────
create table if not exists public.activities (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  group_id     uuid references public.groups(id) on delete cascade,
  activity     text not null,
  activity_date date not null,
  from_time    time not null,
  end_time     time not null,
  location     text,
  is_group     boolean default false,
  created_at   timestamptz default now()
);

alter table public.activities enable row level security;

-- Users can see their own activities
create policy "Users can view own activities"
  on public.activities for select
  using (auth.uid() = user_id);

-- Users can insert their own activities
create policy "Users can insert own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

-- Users can update their own activities
create policy "Users can update own activities"
  on public.activities for update
  using (auth.uid() = user_id);

-- Users can delete their own activities
create policy "Users can delete own activities"
  on public.activities for delete
  using (auth.uid() = user_id);

-- Group members can see group activities
create policy "Group members can view group activities"
  on public.activities for select
  using (
    is_group = true and group_id is not null and
    exists (
      select 1 from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where gm.group_id = activities.group_id
        and (g.created_by = auth.uid() or gm.email = (
          select email from auth.users where id = auth.uid()
        ))
    )
  );

-- ── 2. GROUP_JOIN_REQUESTS table ────────────────────────
create table if not exists public.group_join_requests (
  id             uuid default gen_random_uuid() primary key,
  group_id       uuid references public.groups(id) on delete cascade,
  requester_id   uuid references auth.users(id) on delete cascade,
  first_name     text not null,
  last_name      text not null,
  email          text not null,
  group_name     text not null,
  reason         text,
  relationship   text,
  status         text default 'pending',  -- pending | accepted | denied
  created_at     timestamptz default now()
);

alter table public.group_join_requests enable row level security;

-- Requester can see their own requests
create policy "Requester can view own requests"
  on public.group_join_requests for select
  using (auth.uid() = requester_id);

-- Requester can insert requests
create policy "Requester can submit requests"
  on public.group_join_requests for insert
  with check (auth.uid() = requester_id);

-- Group admin can view pending requests for their groups
create policy "Admin can view group requests"
  on public.group_join_requests for select
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_join_requests.group_id
        and g.created_by = auth.uid()
    )
  );

-- Group admin can update (accept/deny) requests
create policy "Admin can update requests"
  on public.group_join_requests for update
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_join_requests.group_id
        and g.created_by = auth.uid()
    )
  );

-- ── 3. Supabase Edge Function for approval emails ────────
-- NOTE: Email sending (accept/deny notifications) requires
-- a Supabase Edge Function since client-side JS cannot send
-- emails directly. After running this SQL:
-- 1. Go to Supabase Dashboard → Edge Functions → New Function
-- 2. Name it: send-group-email
-- 3. Paste the code from the EDGE-FUNCTION-GUIDE.md file
-- For now, the UI will show the accept/deny buttons and
-- update the status — email sending is handled by the Edge Function.
