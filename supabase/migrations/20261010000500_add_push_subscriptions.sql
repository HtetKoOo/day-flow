create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_read on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy push_subscriptions_insert on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

create table public.push_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_key text not null unique,
  created_at timestamptz not null default now()
);
alter table public.push_reminder_deliveries enable row level security;
revoke all on public.push_reminder_deliveries from anon, authenticated;
