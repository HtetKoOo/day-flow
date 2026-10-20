# DayFlow architecture and operations

This document explains the boundaries that keep DayFlow safe to change as the planner grows.

## Product model

A **task** is a user-owned item. It can be in Inbox or scheduled for one date and time. A **routine** is a user-owned weekly rule that creates virtual timetable blocks only for the visible planner range. Routines do not create a permanent task row for every future date.

- Inbox task: `scheduled_date` and `start_time` are both `NULL`.
- Scheduled task: both values are present; its duration must finish by midnight.
- Routine: weekday selection, start date, optional end date, time, duration, and notes. The planner generates its visible occurrences on demand.
- Routine exception: one row per original occurrence date, owned by the same user as its parent routine. A skip hides it; a move overrides its effective date, time, and duration. Restore deletes the exception.
- Completed tasks stay in their current position so the schedule remains readable.

Every data row is owned by the signed-in user. Supabase RLS is the security boundary; client-side filtering is only a UI convenience.

## Authentication and email

DayFlow uses Supabase Auth for email/password and Google OAuth sign-in. The browser Google flow redirects through Supabase, then returns to `/auth/confirm`, where the server exchanges the authorization code for a cookie-backed session. Email confirmation and password recovery use the same route with a token hash.

Transactional email is delivered through Resend SMTP, using the verified `mail.htetkooo.dev` subdomain. SMTP credentials live only in the Supabase dashboard. The application does not store or expose the Resend API key.

The deployed callback origin is `https://dayflow.htetkooo.dev`; local development uses `http://localhost:3000`. Both are present in the Supabase Redirect URLs allow list. Google Cloud receives only the Supabase callback URL, `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.

## Planner flow

1. The server loads the requested planner range from `/planner?date=…&view=…`.
2. `PlannerShell` coordinates the screen.
3. Focused hooks isolate independent behavior:
   - `use-planner-navigation`: instant URL/range navigation and background route loading
   - `use-planner-task-display`: optimistic task display, browser-tab sync, and Supabase Realtime updates for shared tasks and routines
   - `use-planner-task-actions`: server confirmation, error feedback, completion, and Undo
   - `use-planner-drag`: dnd-kit sensors, pointer position, and drop-time resolution
   - `use-planner-shell-state`: responsive sidebar and remembered Inbox visibility
4. Small components render the header, sidebar, date cells, mobile navigation, time axis, and timeline content.

Keep new behavior inside the narrowest component or hook that owns it. Do not put feature-specific styles into a global selector when the component already has a local class.

## Data consistency

Task changes follow an optimistic pattern:

1. Update the visible task list immediately.
2. Send the authenticated server action.
3. Publish a local browser-tab event and accept Supabase Realtime updates.
4. Revert the optimistic change and show an error if the server rejects it.

This makes common actions feel immediate while the server remains authoritative.

Every task, routine, and routine-exception database event also refreshes the planner snapshot in
other open sessions. The refresh is briefly coalesced so a group of related
events does not create repeated reads. Theme choice, open sheets, and unsaved
editor drafts remain local to each device.

## Database changes

Create a new timestamped file under `supabase/migrations/` for every schema, policy, function, or Realtime change. Do not edit migrations that have been applied to a shared project.

Before pushing a migration:

```sh
pnpm exec supabase migration list
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

Use `supabase migration repair` only when the remote schema is known to already contain the migration’s changes and only after comparing local and remote migration history.

## Release checklist

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, and `pnpm build` pass.
- New migration is reviewed and applied to the intended Supabase project.
- Vercel has the public Supabase URL and publishable key for the environment.
- Supabase Auth Site URL is `https://dayflow.htetkooo.dev`, and its Redirect URLs include production and localhost.
- Resend SMTP has a verified sender, and a password-reset email arrives from `no-reply@mail.htetkooo.dev`.
- Google OAuth completes from the deployed domain and localhost with a configured test user.
- Test with two accounts: each account must only see its own tasks and routines.
- Test a second browser or device: task and routine create/edit/delete changes, task completion, schedule changes, and routine pause/resume should appear without a manual refresh.
- Smoke-test mobile, Safari, and the deployed production URL.

## V2 boundaries

### Routine occurrence identity

`supabase/functions/_shared/routine-occurrences.ts` owns the shared expansion logic used by the planner, calendar export, and reminder sender. `occurrence_date` identifies the original weekly appearance; `scheduled_date` is where it is shown after a move. Queries include both original dates and moved-in dates. Shared timetable SQL follows the same rules, covered by database tests.

The editor's Current range list includes exceptions whose original or non-skipped destination date is visible. All changes fetches the owner's complete paginated exception list on demand. Restoring a day keeps the editor open. Exceptions invalidated by a later weekly rule change are ignored during expansion.

### Calendar import and export

Export resolves profile-local times into UTC instants. Import converts UTC/TZID input into the destination profile timezone. Floating events use the source calendar timezone when available, otherwise the destination timezone. The app cannot store events crossing midnight, all-day events, or imported recurrence rules; those entries are skipped and reported.

`calendar_import_key` and a unique `(user_id, calendar_import_key)` index prevent repeated imports from overwriting existing tasks. Imported tasks default to private. Files are transfers, not ongoing calendar synchronization.

### Public sharing

The public `/share/[token]` route uses narrow SQL RPCs to read a live range by token, without login. Private items are excluded in SQL and notes are not returned. Share metadata contains the owner's display name and timezone. Tokens grant view access to anyone who has the link; Settings revokes access by deleting the owner's share row. Already downloaded exports cannot be revoked.

### Notifications

Browser timer reminders run while DayFlow is open. A device with a registered push subscription skips timer delivery to avoid duplicates. The versioned `/sw.js` route serves the public service worker, which handles push and notification clicks; it caches public offline assets only, not authenticated planner data. PWA installation does not provide offline planner editing. Settings → App provides installation guidance; the root PWA provider offers explicit updates without automatic draft-discarding reloads. See [PWA implementation and testing](PWA.md).

The `send-reminders` Edge Function is authenticated with `x-cron-secret`; JWT verification is disabled for this function only. It uses privileged server credentials to load due reminders and subscriptions. The reminder window begins at the configured lead time and closes at task start. Device-specific claims use a lease, a five-attempt limit, and sent-state deduplication; failures can retry while still due. This does not guarantee exact-time delivery to an operating system.

Explicit device enrollment avoids transferring another account's endpoint. Disable and sign-out clean up the current device's subscription; sign-out is local to that session. See [push operations](PUSH-REMINDERS.md).

## Safe extension points

- Keep presets constrained in validation and database constraints.
- Analytics should derive from completed task records rather than deleting history.
- Offline editing, external calendar sync, and AI planning still need explicit conflict-resolution designs.
- Use the shared routine expander when adding another consumer of one-day changes.
- Follow the [V2 release checklist](V2-RELEASE.md) in addition to the checks above.
