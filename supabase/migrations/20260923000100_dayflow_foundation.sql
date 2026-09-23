-- DayFlow V1. Wall-clock schedules use profiles.timezone (IANA); Inbox has no date/time.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (char_length(display_name) <= 100),
 timezone text not null default 'UTC',
 day_start time not null default '06:00',
 day_end time not null default '00:00',
 week_starts_on integer not null default 1 check (week_starts_on between 0 and 6),
 time_format text not null default '24h' check (time_format in ('12h','24h')),
 created_at timestamptz not null default now()
);
create table public.categories (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 60),
 color text not null default '#527663' check (color ~ '^#[0-9A-Fa-f]{6}$'),
 icon text not null default 'circle' check (char_length(icon) between 1 and 64),
 created_at timestamptz not null default now(),
 unique (user_id,id), unique (user_id,name)
);
create table public.recurring_tasks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 200),
 notes text not null default '' check (char_length(notes) <= 10000),
 category_id uuid,
 start_time time not null check (start_time < time '24:00'),
 duration_minutes integer not null default 30 check (duration_minutes between 5 and 1440),
 frequency text not null check (frequency in ('daily','weekly')),
 interval integer not null default 1 check (interval between 1 and 365),
 days_of_week integer[] not null default '{}',
 starts_on date not null,
 ends_on date,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id,id),
 foreign key (user_id,category_id) references public.categories(user_id,id) on delete set null (category_id),
 check (ends_on is null or ends_on >= starts_on),
 check (days_of_week <@ array[0,1,2,3,4,5,6] and array_position(days_of_week,null) is null),
 check ((frequency='daily' and cardinality(days_of_week)=0) or (frequency='weekly' and cardinality(days_of_week) between 1 and 7)),
 check (extract(epoch from start_time)/60 + duration_minutes <= 1440)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 200),
 notes text not null default '' check (char_length(notes) <= 10000),
 scheduled_date date,
 start_time time check (start_time < time '24:00'),
 duration_minutes integer not null default 30 check (duration_minutes between 5 and 1440),
 category_id uuid,
 is_completed boolean not null default false,
 completed_at timestamptz,
 recurrence_rule text, -- Reserved for compatibility; recurring_tasks is the authoritative template.
 recurring_task_id uuid,
 occurrence_date date, -- Original occurrence identity survives a manual reschedule.
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (user_id,category_id) references public.categories(user_id,id) on delete set null (category_id),
 foreign key (user_id,recurring_task_id) references public.recurring_tasks(user_id,id),
 unique (user_id,recurring_task_id,occurrence_date),
 check ((scheduled_date is null) = (start_time is null)),
 check ((recurring_task_id is null) = (occurrence_date is null)),
 check (start_time is null or extract(epoch from start_time)/60 + duration_minutes <= 1440),
 check (is_completed = (completed_at is not null))
);
create index tasks_user_date_idx on public.tasks(user_id,scheduled_date,start_time);
create index tasks_inbox_idx on public.tasks(user_id,sort_order) where scheduled_date is null;
create index tasks_category_idx on public.tasks(user_id,category_id);
create index recurring_category_idx on public.recurring_tasks(user_id,category_id);
create index recurring_active_idx on public.recurring_tasks(user_id,starts_on) where is_active;

create function public.validate_profile_timezone() returns trigger language plpgsql set search_path = '' as $$
begin
 if not exists (select 1 from pg_timezone_names where name = new.timezone) then
  raise exception 'Invalid IANA timezone' using errcode='23514';
 end if;
 return new;
end;
$$;
create trigger profiles_timezone before insert or update on public.profiles for each row execute function public.validate_profile_timezone();

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tasks_updated before update on public.tasks for each row execute function public.touch_updated_at();
create trigger recurring_updated before update on public.recurring_tasks for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
 return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Backfill users if this migration is applied to an existing Auth project.
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.recurring_tasks enable row level security;

revoke all on public.profiles, public.categories, public.tasks, public.recurring_tasks from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.tasks, public.recurring_tasks to authenticated;
create policy profiles_read on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy categories_read on public.categories for select to authenticated using ((select auth.uid())=user_id);
create policy categories_insert on public.categories for insert to authenticated with check ((select auth.uid())=user_id);
create policy categories_update on public.categories for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy categories_delete on public.categories for delete to authenticated using ((select auth.uid())=user_id);
create policy tasks_read on public.tasks for select to authenticated using ((select auth.uid())=user_id);
create policy tasks_insert on public.tasks for insert to authenticated with check ((select auth.uid())=user_id);
create policy tasks_update on public.tasks for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy tasks_delete on public.tasks for delete to authenticated using ((select auth.uid())=user_id);
create policy recurring_tasks_read on public.recurring_tasks for select to authenticated using ((select auth.uid())=user_id);
create policy recurring_tasks_insert on public.recurring_tasks for insert to authenticated with check ((select auth.uid())=user_id);
create policy recurring_tasks_update on public.recurring_tasks for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy recurring_tasks_delete on public.recurring_tasks for delete to authenticated using ((select auth.uid())=user_id);
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.validate_profile_timezone() from public, anon, authenticated;
