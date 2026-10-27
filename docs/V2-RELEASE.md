# V2 release checklist

This is a verification checklist, not a record that these checks have been completed. Mark items only with evidence from the target release/environment. Plan tomorrow currently provides an always-visible shortcut and a dismissible evening reminder. The guided planning sheet and a persisted “plan ready” status remain deferred.

## Automated gates

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test` (if the environment blocks tsx CLI IPC, use `node --import tsx --test tests/*.test.ts`)
- [x] `pnpm test:db`
- [x] `pnpm build`

Database simulation tests do not prove the hosted project's migrations or realtime configuration are current. TypeScript excludes `supabase/functions`; the website typecheck does not validate the Deno deployment. Verify the deployed sender separately.

## Target environment

- [x] Review `supabase migration list` and `db push --dry-run`: linked project is up to date through `20261027000100`; no pending migrations to apply (2026-10-27).
- [ ] Redeploy `send-reminders` when its code/shared modules change.
- [ ] Set website public environment variables and matching Edge secrets; configure one every-minute scheduler.
- [ ] Check Auth redirect URLs, email confirmation/reset, and Google login on the production origin.
- [ ] Review [push setup](PUSH-REMINDERS.md) and confirm actual end-to-end delivery.

## Functional checks

- [ ] Plan tomorrow remains visible on phone/tablet/desktop at any hour; repeated clicks target profile-local tomorrow rather than advancing the viewed date.
- [ ] Evening emphasis starts at 18:00 in the profile timezone. Only today's Day view shows a non-modal reminder; dismissing hides it for that account/date on this device, without removing the toolbar button.
- [ ] A timezone-local midnight resets the reminder date and tomorrow target. Scheduled tasks (not routines alone) change the action to review wording.

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

## Verification evidence — October 27, 2026

This evidence applies to the local v2 release candidate, not to a newly deployed production build. The physical iPhone PWA and production end-to-end items above remain unchecked.

| Check                                                    | Result                                                                                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint and TypeScript                                    | Passed                                                                                                                                                                                             |
| Unit / database-backed feature suite                     | 50 tests passed using `node --import tsx --test tests/*.test.ts`                                                                                                                                   |
| Foundation database/RLS suite                            | 70 assertions passed with `pnpm test:db`                                                                                                                                                           |
| Production build                                         | Passed using `pnpm exec next build --webpack`; `/privacy` is a static public route                                                                                                                 |
| Runtime diagnostics                                      | No config or browser runtime errors reported by the local Next.js server                                                                                                                           |
| Hosted migration history                                 | Local and linked remote versions match through `20261027000100`; `db push --dry-run` reports up to date; no remote mutations performed                                                             |
| Calendar / private share / recurring changes / reminders | Automated coverage passed for timezone round-trips, duplicate import, privacy exclusions, one-day exceptions, reminder timing, and account isolation; not a substitute for production device tests |
| Phone browser                                            | Measured CSS viewport 375 × 812: privacy page, Week and 2 days planner have no document-level horizontal overflow; demo task and routine edits saved and demo was reset                            |
| Desktop browser                                          | Measured CSS viewport 1440 × 900: Week and 2 days planner have no document-level horizontal overflow                                                                                               |
| Privacy links                                            | Settings link opened `/privacy`; Login link verified in source; public static build has no authentication dependency                                                                               |
| Feedback receipt                                         | User previously confirmed developer email receipt; optional reply email now appears in email body and Reply-To                                                                                     |
| Send another message                                     | Implemented by remounting a fresh form and restoring focus to Type; no additional real support email sent during this verification                                                                 |

User-reported iPhone issue: time-picker columns could not be swiped inside task editors. The candidate now uses a nested modal scroll boundary, native scrolling (no wheel interception), and 44 px options. Browser verification scrolled the Minutes column to the end, closed the picker, restored trigger focus, and left Save disabled; no user data was changed. A physical iPhone swipe retest is still required.

Known build warning: the existing `preferredRegion` route configuration is deprecated in this Next.js version. The build succeeds; migrating that configuration remains follow-up work.

### Remaining target-device / deployment checks

1. Deploy the reviewed release candidate with the environment settings in README. This task prepares files and does not publish a tag or deployment.
2. On a real iPhone, install/open the current deployment from Home Screen. Check safe-area spacing, keyboard behavior, all three planner views, task/routine edits, and private exports.
3. Enable push on that iPhone, create a future reminder, close the app, and confirm actual delivery. Confirm private notification preview choices in iOS settings.
4. On the production origin, open a view-only link while signed out, confirm private items/notes are absent, then verify revocation. Check calendar import/export and auth redirects on that origin.
5. Send one feedback report, confirm receipt and optional reply email, then choose Send another message. Confirm a clean form, focus return, and the expected one-minute rate limit. This is an explicit release test, not an automatic reply feature.
6. Review the public privacy text against actual deployed provider settings and retention practices; update it whenever those practices change. It makes no claim of jurisdiction-specific legal compliance.
7. Record device/browser versions and outcomes here before marking the remaining boxes complete. Commit, tag `v2.0.0`, and publish only after review and successful target checks.

## Account deletion addition

The candidate adds `20261027000200_account_deletion.sql`. The earlier hosted-migration up-to-date result above predates this addition: this new migration has not been applied to the hosted project by the agent. Apply it before deploying the self-service deletion feature.

The isolated account-deletion test covers a stale session even with a new token-issued timestamp, a foreign session, invalid/null confirmation, anonymous access denial, transactional rollback, all account-linked cascades, preservation of a second account, and replay after deletion. No real Auth user was deleted. A disposable-account end-to-end check remains required after migration/deployment. The privacy page and release notes now describe self-service deletion and its limits.

## Account deletion OTP hardening

`20261027000300_account_deletion_otp.sql` supersedes the sign-in-only deletion flow above. The previous single-argument deletion RPC is dropped, not left as an alternate path. Codes are generated by the server, hashed in private storage, sent only to the verified account email, bound to the current session, and consumed by permanent deletion. Test evidence now includes expiry, five-attempt lockout, 60-second cooldown, five-per-hour request limits, invalidation after resend/email change, unsent-code denial, and old-RPC removal. No real verification email or account deletion was performed by the agent. Configure `SUPABASE_SECRET_KEY` (server only, Sensitive) and apply both account deletion migrations before the disposable-account end-to-end release check.
