alter table public.tasks
  add column if not exists reminder_minutes integer
  check (reminder_minutes is null or reminder_minutes in (5, 10, 15, 30));

alter table public.recurring_tasks
  add column if not exists reminder_minutes integer
  check (reminder_minutes is null or reminder_minutes in (5, 10, 15, 30));
