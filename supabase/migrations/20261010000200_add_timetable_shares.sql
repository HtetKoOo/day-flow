-- Read-only timetable links expose only non-private scheduled items.
create table public.timetable_shares (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (owner_id, starts_on, ends_on),
  check (ends_on >= starts_on)
);

alter table public.timetable_shares enable row level security;
revoke all on public.timetable_shares from anon, authenticated;
grant select, insert, update, delete on public.timetable_shares to authenticated;
create policy timetable_shares_owner on public.timetable_shares
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create or replace function public.get_shared_timetable(p_token uuid)
returns table (
  scheduled_date date,
  start_time time,
  duration_minutes integer,
  title text,
  color text,
  icon text
)
language sql
stable
security definer
set search_path = ''
as $$
  with shared as (
    select owner_id, starts_on, ends_on
    from public.timetable_shares
    where token = p_token
      and (expires_at is null or expires_at > now())
  ),
  scheduled_items as (
    select
      t.scheduled_date,
      t.start_time,
      t.duration_minutes,
      t.title,
      coalesce(t.color, 'sage') as color,
      coalesce(t.icon, 'focus') as icon
    from public.tasks t
    join shared s on s.owner_id = t.user_id
    where t.scheduled_date between s.starts_on and s.ends_on
      and t.start_time is not null
      and coalesce(t.is_private, false) = false
  ),
  routine_items as (
    select
      occurrence.day::date as scheduled_date,
      r.start_time,
      r.duration_minutes,
      r.title,
      coalesce(r.color, 'sage') as color,
      coalesce(r.icon, 'focus') as icon
    from public.recurring_tasks r
    join shared s on s.owner_id = r.user_id
    cross join lateral generate_series(s.starts_on, s.ends_on, interval '1 day') as occurrence(day)
    where r.is_active
      and coalesce(r.is_private, false) = false
      and occurrence.day::date >= r.starts_on
      and (r.ends_on is null or occurrence.day::date <= r.ends_on)
      and extract(dow from occurrence.day)::integer = any(r.days_of_week)
  )
  select * from scheduled_items
  union all
  select * from routine_items
  order by scheduled_date, start_time, title;
$$;

revoke all on function public.get_shared_timetable(uuid) from public;
grant execute on function public.get_shared_timetable(uuid) to anon, authenticated;
