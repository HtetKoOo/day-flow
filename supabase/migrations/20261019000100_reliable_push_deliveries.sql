-- Track each device independently; a failed device must not suppress the others.
create table public.push_reminder_attempts (
  reminder_key text not null,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 1,
  claim_token uuid not null,
  lease_until timestamptz not null,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  primary key (reminder_key, subscription_id)
);
alter table public.push_reminder_attempts enable row level security;
revoke all on public.push_reminder_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.push_reminder_attempts to service_role;

-- Atomic claim with an expiring lease protects overlapping cron runs. A worker
-- that crashes can be retried; a successful device is never claimed again.
create function public.claim_push_reminder(p_key text, p_subscription uuid)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.push_reminder_attempts as delivery
    (reminder_key, subscription_id, status, claim_token, lease_until)
  values (p_key, p_subscription, 'pending', gen_random_uuid(), now() + interval '2 minutes')
  on conflict (reminder_key, subscription_id) do update
    set status = 'pending',
        attempts = delivery.attempts + 1,
        claim_token = gen_random_uuid(),
        lease_until = now() + interval '2 minutes',
        error_code = null
    where delivery.status <> 'sent'
      and delivery.attempts < 5
      and delivery.next_attempt_at <= now()
      and (delivery.status = 'failed' or delivery.lease_until <= now())
  returning claim_token;
$$;
revoke all on function public.claim_push_reminder(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_push_reminder(text, uuid) to service_role;
