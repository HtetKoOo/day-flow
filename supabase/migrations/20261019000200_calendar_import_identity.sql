-- Nullable for existing/manual tasks; each imported source event is unique per owner.
alter table public.tasks add column calendar_import_key text;
alter table public.tasks add constraint tasks_calendar_import_key_length
  check (calendar_import_key is null or length(calendar_import_key) = 64);
alter table public.tasks add constraint tasks_calendar_import_identity
  unique (user_id, calendar_import_key);
