-- Keep one adjacent day in every planner snapshot. This lets a Sunday 2-day
-- view render from the already-loaded weekly data instead of navigating again.
create or replace function public.planner_snapshot(
  p_selected_date date default null,
  p_view text default 'day'
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with profile as (
    select
      p.timezone,
      p.week_starts_on,
      coalesce(p_selected_date, (now() at time zone p.timezone)::date) as selected_date
    from public.profiles p
    where p.id = (select auth.uid())
  ), calendar as (
    select
      profile.*,
      selected_date - (
        (extract(dow from selected_date)::integer - week_starts_on + 7) % 7
      ) as strip_from
    from profile
  ), bounds as (
    select
      calendar.*,
      strip_from + 6 as strip_to,
      case
        when p_view = 'week' then strip_from + 6
        when p_view = 'two-days' then selected_date + 1
        else selected_date
      end as range_to
    from calendar
  )
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'timezone', timezone,
        'week_starts_on', week_starts_on
      )
      from bounds
    ),
    'loaded_through', (
      select greatest(strip_to + 1, range_to)::text from bounds
    ),
    'inbox', coalesce((
      select jsonb_agg(to_jsonb(inbox_task))
      from (
        select t.*
        from public.tasks t
        where t.user_id = (select auth.uid())
          and t.scheduled_date is null
        order by t.created_at desc, t.id
        limit 500
      ) inbox_task
    ), '[]'::jsonb),
    'inbox_count', (
      select count(*)
      from public.tasks t
      where t.user_id = (select auth.uid())
        and t.scheduled_date is null
    ),
    'scheduled', coalesce((
      select jsonb_agg(to_jsonb(scheduled_task))
      from (
        select t.*
        from public.tasks t
        cross join bounds b
        where t.user_id = (select auth.uid())
          and t.scheduled_date >= b.strip_from
          and t.scheduled_date <= greatest(b.strip_to + 1, b.range_to)
        order by t.scheduled_date, t.start_time, t.id
        limit 1000
      ) scheduled_task
    ), '[]'::jsonb),
    'scheduled_count', (
      select count(*)
      from public.tasks t
      cross join bounds b
      where t.user_id = (select auth.uid())
        and t.scheduled_date >= b.strip_from
        and t.scheduled_date <= greatest(b.strip_to + 1, b.range_to)
    )
  );
$$;

revoke all on function public.planner_snapshot(date, text) from public;
grant execute on function public.planner_snapshot(date, text) to authenticated;
