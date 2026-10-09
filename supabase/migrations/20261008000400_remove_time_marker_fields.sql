-- Remove the short-lived time-marker fields from the remote project.
-- `if exists` also keeps a fresh database setup unchanged.
alter table public.tasks
  drop column if exists is_moment;

alter table public.recurring_tasks
  drop column if exists is_moment;
