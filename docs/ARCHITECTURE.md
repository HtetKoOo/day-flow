# DayFlow architecture and operations

This document explains the boundaries that keep DayFlow safe to change as the planner grows.

## Product model

A **task** is a user-owned item. It can be in Inbox or scheduled for one date and time. A **routine** is a user-owned weekly rule that creates virtual timetable blocks only for the visible planner range. Routines do not create a permanent task row for every future date.

- Inbox task: `scheduled_date` and `start_time` are both `NULL`.
- Scheduled task: both values are present; its duration must finish by midnight.
- Routine: weekday selection, start date, optional end date, time, duration, and notes. The planner generates its visible occurrences on demand.
- Completed tasks stay in their current position so the schedule remains readable.

Every data row is owned by the signed-in user. Supabase RLS is the security boundary; client-side filtering is only a UI convenience.

## Planner flow

1. The server loads the requested planner range from `/planner?date=…&view=…`.
2. `PlannerShell` coordinates the screen.
3. Focused hooks isolate independent behavior:
   - `use-planner-navigation`: instant URL/range navigation and background route loading
   - `use-planner-task-display`: optimistic task display, browser-tab sync, and Supabase Realtime updates
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
- Supabase Auth Site URL and Redirect URLs include the deployed domain.
- Test with two accounts: each account must only see its own tasks and routines.
- Test a second browser tab: schedule/completion changes should appear without a manual refresh.
- Smoke-test mobile, Safari, and the deployed production URL.

## Safe extension points

Future work should build on the current model:

- Icon selection belongs on `tasks` and `recurring_tasks`, with a constrained preset list.
- Analytics should derive from completed task records; do not delete historical data automatically in V1.
- Notifications, calendar integrations, AI planning, and offline editing need separate product and conflict-resolution designs.
- If a routine needs one-date exceptions, model an explicit exception rather than mutating its weekly rule for every occurrence.
