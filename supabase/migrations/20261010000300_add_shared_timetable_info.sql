-- Public metadata is deliberately limited to the owner's display name and share range.
create or replace function public.get_shared_timetable_info(p_token uuid)
returns table (
  display_name text,
  starts_on date,
  ends_on date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    nullif(btrim(p.display_name), '') as display_name,
    s.starts_on,
    s.ends_on
  from public.timetable_shares s
  join public.profiles p on p.id = s.owner_id
  where s.token = p_token
    and (s.expires_at is null or s.expires_at > now());
$$;

revoke all on function public.get_shared_timetable_info(uuid) from public;
grant execute on function public.get_shared_timetable_info(uuid) to anon, authenticated;
