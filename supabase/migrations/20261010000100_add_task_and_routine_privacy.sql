-- Private items remain visible to their owner in DayFlow but can be excluded
-- or masked when calendar export and sharing are introduced.
alter table public.tasks
  add column if not exists is_private boolean not null default false;

alter table public.recurring_tasks
  add column if not exists is_private boolean not null default false;
