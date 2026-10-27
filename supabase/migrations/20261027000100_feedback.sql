-- Feedback is visible only to database administrators, never to other app users.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('feedback','bug','feature')),
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  reply_email text check (reply_email is null or char_length(reply_email) between 3 and 254),
  app_version text not null check (char_length(app_version) between 1 and 40),
  created_at timestamptz not null default now()
);
create index feedback_user_created on public.feedback(user_id, created_at desc);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

-- Serialize submissions per account so concurrent requests cannot bypass limits.
create function public.submit_feedback(p_kind text, p_message text, p_reply_email text, p_app_version text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  feedback_id uuid;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 2731));
  if exists (select 1 from public.feedback where user_id = actor and created_at > now() - interval '1 minute')
     or (select count(*) from public.feedback where user_id = actor and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'FEEDBACK_RATE_LIMIT' using errcode = 'P0001';
  end if;
  insert into public.feedback(user_id,kind,message,reply_email,app_version)
  values(actor,p_kind,btrim(p_message),nullif(btrim(p_reply_email),''),p_app_version)
  returning id into feedback_id;
  return feedback_id;
end;
$$;
revoke all on function public.submit_feedback(text,text,text,text) from public, anon;
grant execute on function public.submit_feedback(text,text,text,text) to authenticated;
