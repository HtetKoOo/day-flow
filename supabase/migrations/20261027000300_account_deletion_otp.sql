-- Replace the sign-in-only deletion path. Never leave the old overload callable.
drop function public.delete_own_account(text);

create table public.account_deletion_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Keep cooldown counters across sign-out; live session is checked separately.
  session_id uuid not null,
  request_id uuid not null unique,
  email text not null,
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  sent boolean not null default false,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  requested_at timestamptz not null default now(),
  window_started_at timestamptz not null default now(),
  requests_in_window integer not null default 1
);
alter table public.account_deletion_challenges enable row level security;
revoke all on public.account_deletion_challenges from public, anon, authenticated;
grant select, update on public.account_deletion_challenges to service_role;

create or replace function public.can_delete_own_account()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id::text=(auth.jwt()->>'session_id') and s.user_id=auth.uid()
      and u.email is not null and u.email_confirmed_at is not null
  );
$$;

-- Only the application server may register a randomly generated code hash.
create function public.begin_account_deletion_challenge(p_user uuid, p_session uuid, p_hash text, p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare previous public.account_deletion_challenges; target_email text; window_start timestamptz; requests integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 2703));
  select u.email into target_email from auth.users u join auth.sessions s on s.user_id=u.id
    where u.id=p_user and s.id=p_session and u.email_confirmed_at is not null;
  if target_email is null then return jsonb_build_object('ok',false,'reason','session'); end if;
  select * into previous from public.account_deletion_challenges where user_id=p_user for update;
  if found then
    if previous.requested_at > now()-interval '60 seconds' then return jsonb_build_object('ok',false,'reason','cooldown'); end if;
    if previous.window_started_at > now()-interval '1 hour' and previous.requests_in_window >= 5 then
      return jsonb_build_object('ok',false,'reason','rate_limit');
    end if;
  end if;
  window_start := case when previous.window_started_at > now()-interval '1 hour' then previous.window_started_at else now() end;
  requests := case when previous.window_started_at > now()-interval '1 hour' then previous.requests_in_window+1 else 1 end;
  insert into public.account_deletion_challenges(user_id,session_id,request_id,email,code_hash,expires_at,window_started_at,requests_in_window)
  values(p_user,p_session,p_request,target_email,p_hash,now()+interval '10 minutes',window_start,requests)
  on conflict(user_id) do update set session_id=excluded.session_id,request_id=excluded.request_id,email=excluded.email,
    code_hash=excluded.code_hash,sent=false,expires_at=excluded.expires_at,attempts=0,requested_at=now(),
    window_started_at=excluded.window_started_at,requests_in_window=excluded.requests_in_window;
  return jsonb_build_object('ok',true,'email',target_email);
end;
$$;
revoke all on function public.begin_account_deletion_challenge(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.begin_account_deletion_challenge(uuid,uuid,text,uuid) to service_role;

create function public.delete_own_account(p_confirmation text, p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); challenge public.account_deletion_challenges; current_email text;
begin
  if actor is null or not public.can_delete_own_account() then return jsonb_build_object('ok',false,'reason','session'); end if;
  if p_confirmation is distinct from 'DELETE' then return jsonb_build_object('ok',false,'reason','confirmation'); end if;
  select * into challenge from public.account_deletion_challenges where user_id=actor for update;
  if not found or challenge.session_id::text is distinct from (auth.jwt()->>'session_id') or not challenge.sent then
    return jsonb_build_object('ok',false,'reason','request_code');
  end if;
  if challenge.expires_at <= now() then return jsonb_build_object('ok',false,'reason','expired'); end if;
  if challenge.attempts >= 5 then return jsonb_build_object('ok',false,'reason','attempts'); end if;
  select email into current_email from auth.users where id=actor;
  if current_email is distinct from challenge.email then return jsonb_build_object('ok',false,'reason','request_code'); end if;
  -- Return a failure instead of raising: wrong-code attempts must commit.
  update public.account_deletion_challenges set attempts=attempts+1 where user_id=actor;
  if p_code is null or p_code !~ '^[0-9]{6}$' or challenge.code_hash <> pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(challenge.request_id::text || ':' || p_code,'UTF8')),'hex') then
    return jsonb_build_object('ok',false,'reason','invalid_code');
  end if;
  delete from public.push_reminder_deliveries d
    where (split_part(d.reminder_key,':',1)='task' and exists(select 1 from public.tasks t where t.user_id=actor and t.id::text=split_part(d.reminder_key,':',2)))
       or (split_part(d.reminder_key,':',1)='routine' and exists(select 1 from public.recurring_tasks r where r.user_id=actor and r.id::text=split_part(d.reminder_key,':',2)));
  delete from auth.users where id=actor;
  if not found then raise exception 'Account not found' using errcode='42501'; end if;
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.delete_own_account(text,text) from public,anon;
grant execute on function public.delete_own_account(text,text) to authenticated;
