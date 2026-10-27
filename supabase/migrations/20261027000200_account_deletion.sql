-- Freshness comes from the actual Auth session creation time, not JWT iat
-- (refreshing a token must not count as signing in again).
create function public.can_delete_own_account()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions
    where id::text = (auth.jwt() ->> 'session_id')
      and user_id = auth.uid()
      and created_at >= now() - interval '5 minutes'
      and created_at <= now()
  );
$$;
revoke all on function public.can_delete_own_account() from public, anon;
grant execute on function public.can_delete_own_account() to authenticated;

-- There is deliberately no target-user argument. Direct RPC callers must pass
-- the same confirmation and freshness checks as the server action.
create function public.delete_own_account(p_confirmation text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_confirmation is distinct from 'DELETE' then
    raise exception 'CONFIRM_DELETE_REQUIRED' using errcode='22023';
  end if;
  if not public.can_delete_own_account() then
    raise exception 'RECENT_SIGN_IN_REQUIRED' using errcode='42501';
  end if;
  -- Remove legacy deduplication keys while their task/routine owners exist.
  delete from public.push_reminder_deliveries d
  where (split_part(d.reminder_key, ':', 1) = 'task' and exists (
    select 1 from public.tasks t where t.user_id=actor and t.id::text=split_part(d.reminder_key, ':', 2)
  )) or (split_part(d.reminder_key, ':', 1) = 'routine' and exists (
    select 1 from public.recurring_tasks r where r.user_id=actor and r.id::text=split_part(d.reminder_key, ':', 2)
  ));
  -- The Auth user, profile, planner rows, share links, subscriptions, delivery
  -- attempts, feedback, and Auth sessions are removed in this transaction by FK cascades.
  delete from auth.users where id=actor;
  if not found then raise exception 'Account not found' using errcode='42501'; end if;
  return true;
end;
$$;
revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;
