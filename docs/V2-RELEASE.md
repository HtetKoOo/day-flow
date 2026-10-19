# V2 release checklist

This is a verification checklist, not a record that these checks have been completed. Mark items only with evidence from the target release/environment. The Plan tomorrow feature remains deferred; do not include it in V2 acceptance claims.

## Automated gates

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test` (if the environment blocks tsx CLI IPC, use `node --import tsx --test tests/*.test.ts`)
- [ ] `pnpm test:db`
- [ ] `pnpm build`

Database simulation tests do not prove the hosted project's migrations or realtime configuration are current. TypeScript excludes `supabase/functions`; the website typecheck does not validate the Deno deployment. Verify the deployed sender separately.

## Target environment

- [ ] Review `supabase migration list` and `db push --dry-run`, then apply pending migrations to the intended project.
- [ ] Redeploy `send-reminders` when its code/shared modules change.
- [ ] Set website public environment variables and matching Edge secrets; configure one every-minute scheduler.
- [ ] Check Auth redirect URLs, email confirmation/reset, and Google login on the production origin.
- [ ] Review [push setup](PUSH-REMINDERS.md) and confirm actual end-to-end delivery.

## Functional checks

- [ ] Task and routine Save disabled initially; edit each field, then restore it to confirm Save disables again.
- [ ] New item rejects blank/whitespace titles, invalid durations, midnight overflow, missing repeat days, and invalid end dates.
- [ ] One-day routine change preserves other appearances; move across a week boundary, skip, and restore.
- [ ] Changed days defaults to the displayed range; All changes finds dates outside it and supports repeated restores.
- [ ] Weekly rule changes and pause/resume stay consistent across planner, export, share, and reminders.
- [ ] Save/delete/skip/restore failures show errors while retaining the draft; verify uncertain network outcomes against the timetable before retrying.
- [ ] Calendar round-trip across two profile timezones; duplicate import does not overwrite existing edits.
- [ ] Import preview reports unsupported entries and excludes unselected/out-of-range entries; private default is preserved.
- [ ] Export private exclusions/Busy/details and notes options match the downloaded content.
- [ ] Share opens logged out, hides all private entries/notes, shows intended display name, and stops working after revocation.
- [ ] Two accounts cannot read/update each other's tasks, routines, exceptions, shares, or push endpoints.
- [ ] Changes appear in a second tab/device via realtime without losing an open draft.
- [ ] Push works with tab closed; skipped/paused/completed items do not notify; sign-out/account switch does not deliver another account's reminders.

## UI and accessibility checks

- [ ] Small phone (375 px), tablet (around 800 px), and wide desktop; check both sidebar states.
- [ ] Safari and another supported browser: header stays one row, right controls remain aligned, date follows the timeline boundary, no horizontal page overflow.
- [ ] Dialogs fit short screens, scroll correctly, and preserve reachable actions above mobile navigation/keyboard.
- [ ] Keyboard navigation, visible focus, dialog close/focus return, meaningful labels, disabled/pending states, and error announcements.
- [ ] Light and dark mode, long titles, Burmese text, empty days, crowded/overlapping timelines.
- [ ] PWA install/offline fallback does not imply offline planner editing.

## Release handoff

- [ ] README and linked usage/setup docs match the final behavior.
- [ ] Record any remaining known issues and migration/deployment results.
- [ ] Commit reviewed changes; push/deploy only when authorized.
- [ ] Smoke-test the deployed URL after deployment rather than relying only on localhost.
