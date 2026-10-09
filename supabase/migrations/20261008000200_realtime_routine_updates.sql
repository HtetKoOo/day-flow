-- Planner clients already receive task changes. Add weekly routines so every
-- browser refreshes its generated timetable blocks after a routine changes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'recurring_tasks'
  ) then
    alter publication supabase_realtime add table public.recurring_tasks;
  end if;
end $$;
