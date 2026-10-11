grant update on public.push_subscriptions to authenticated;

create policy push_subscriptions_update
  on public.push_subscriptions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
