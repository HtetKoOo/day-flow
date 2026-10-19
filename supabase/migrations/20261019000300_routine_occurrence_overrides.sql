-- Tie an exception to a routine owned by the same account at the database level.
alter table public.recurring_tasks add constraint recurring_tasks_id_owner unique (id, user_id);
alter table public.routine_exceptions add constraint routine_exception_owner
  foreign key (recurring_task_id, user_id) references public.recurring_tasks(id, user_id) on delete cascade;
alter table public.routine_exceptions add constraint routine_exception_time_bounds
  check (start_time is null or (start_time < time '24:00' and
    (duration_minutes is null or extract(epoch from start_time)/60 + duration_minutes <= 1440)));

create or replace function public.get_shared_timetable(p_token uuid)
returns table (scheduled_date date, start_time time, duration_minutes integer, title text, color text, icon text)
language sql stable security definer set search_path = ''
as $$
  with shared as (
    select owner_id, starts_on, ends_on from public.timetable_shares
    where token = p_token and (expires_at is null or expires_at > now())
  ), scheduled_items as (
    select t.scheduled_date, t.start_time, t.duration_minutes, t.title,
      coalesce(t.color, 'sage') as color, coalesce(t.icon, 'focus') as icon
    from public.tasks t join shared s on s.owner_id = t.user_id
    where t.scheduled_date between s.starts_on and s.ends_on
      and t.start_time is not null and coalesce(t.is_private, false) = false
  ), routine_items as (
    select coalesce(e.scheduled_date, occurrence.day) as scheduled_date,
      coalesce(e.start_time, r.start_time) as start_time,
      coalesce(e.duration_minutes, r.duration_minutes) as duration_minutes,
      r.title, coalesce(r.color, 'sage') as color, coalesce(r.icon, 'focus') as icon
    from public.recurring_tasks r join shared s on s.owner_id = r.user_id
    cross join lateral (
      select day::date as day from generate_series(s.starts_on, s.ends_on, interval '1 day') as dates(day)
      union
      select occurrence_date from public.routine_exceptions
        where recurring_task_id = r.id and user_id = r.user_id
          and scheduled_date between s.starts_on and s.ends_on
    ) as occurrence
    left join public.routine_exceptions e on e.recurring_task_id = r.id
      and e.user_id = r.user_id and e.occurrence_date = occurrence.day
    where r.is_active and coalesce(r.is_private, false) = false
      and occurrence.day >= r.starts_on and (r.ends_on is null or occurrence.day <= r.ends_on)
      and extract(dow from occurrence.day)::integer = any(r.days_of_week)
      and coalesce(e.is_skipped, false) = false
      and coalesce(e.scheduled_date, occurrence.day) between s.starts_on and s.ends_on
      and extract(epoch from coalesce(e.start_time, r.start_time))/60 + coalesce(e.duration_minutes, r.duration_minutes) <= 1440
  )
  select * from scheduled_items union all select * from routine_items
  order by scheduled_date, start_time, title;
$$;
revoke all on function public.get_shared_timetable(uuid) from public;
grant execute on function public.get_shared_timetable(uuid) to anon, authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') and not exists (
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='routine_exceptions'
  ) then alter publication supabase_realtime add table public.routine_exceptions; end if;
end $$;
