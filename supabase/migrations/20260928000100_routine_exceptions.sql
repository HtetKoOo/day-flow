create table public.routine_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  recurring_task_id uuid not null references public.recurring_tasks(id) on delete cascade,
  occurrence_date date not null,
  scheduled_date date,
  start_time time,
  duration_minutes integer,
  is_skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recurring_task_id, occurrence_date),
  check ((scheduled_date is null) = (start_time is null)),
  check (is_skipped or scheduled_date is not null),
  check (duration_minutes is null or duration_minutes between 5 and 1440)
);
alter table public.routine_exceptions enable row level security;
grant select, insert, update, delete on public.routine_exceptions to authenticated;
create policy routine_exceptions_owner on public.routine_exceptions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create trigger routine_exceptions_updated before update on public.routine_exceptions for each row execute function public.touch_updated_at();
