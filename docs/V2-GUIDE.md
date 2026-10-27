# DayFlow V2 guide

This guide describes implemented behavior, not a guarantee that every deployment has its required migrations and secrets installed.

## Plan tomorrow

The toolbar always offers Plan tomorrow (Tomorrow on mobile). It opens tomorrow's Day view based on your profile timezone, regardless of the date currently displayed. Repeated clicks do not copy tasks or advance to another date. If loaded data includes scheduled tasks for tomorrow, the desktop action says Review tomorrow; routines alone do not count as a prepared task plan.

From 18:00 local time, the button gains a quiet lavender emphasis. Today's Day view also offers a small reminder, without automatic dialogs, animation, or notifications. Dismiss it for the rest of that local date on this device; it is scoped to your account and does not mark a plan complete. The button stays available. On mobile, the calendar icon in the header returns to today; Go to today is also available inside the date picker.

The guided task-selection/planning sheet and saved plan-ready status are not implemented yet.

## Tasks and routines

Tasks belong to Inbox or one scheduled date/time. Routines are weekly rules. Click a routine on the timetable to edit only that appearance: change its date, time, or duration, or choose Skip this day. Edit entire routine opens the weekly rule instead.

To restore a skipped or rescheduled day, open the routine editor's Changed days section. Current range shows changes relevant to the displayed date range. All changes fetches changes across all dates. Restore removes the override and returns that occurrence to its weekly schedule.

Save changes is disabled until editable values differ from the initial draft. Returning values to their originals disables it again. New tasks require a valid name and schedule; new routines also need at least one weekday. All scheduled items must finish by midnight. Delete, Pause/Resume, and Skip are separate actions.

## Calendar export

Choose the planner date/view range and open Export. Review the displayed range before downloading the `.ics` file. Scheduled tasks and expanded routine appearances are included; Inbox tasks are not scheduled events.

Choose how private items are handled:

- Exclude private items (default).
- Show private items as Busy, without their title/notes.
- Include private details only when you intend to distribute those details.

Notes are a separate export option. Export converts profile-local times to UTC so compatible calendars can preserve the instant. An export is a copy: later DayFlow changes do not update it, and stopping a share link does not revoke a file.

## Calendar import

Open Import, choose a file, and review the preview, destination timezone, date range, and selected entries. Entries outside the selected range are skipped. Imports create tasks in the receiving account's own timetable, so they can overlap that account's existing plans. Use a share link if the recipient only wants to view your timetable.

Imported tasks are private by default; review the checkbox before confirming. Repeat imports are deduplicated per account and do not overwrite edits to an existing imported task. This is not two-way synchronization.

Current limits:

- Up to 2 MB and 200 parsed events per file.
- Recurrence rules, all-day, cancelled, invalid, and overnight events are skipped/reported rather than expanded into tasks.
- UTC, TZID, and floating event times are supported. Check the preview when the source calendar omits timezone information.
- Export rejects nonexistent local times during a daylight-saving transition; ambiguous fall-back times choose the earlier instant.

## View-only sharing

Create a link for the desired planner range and send that link to the viewer. They open it without importing or signing in. It does not add anything to their account. The page reads current timetable data when opened/refreshed, rather than a frozen export.

Private tasks and routines are always excluded from shared links, and notes are not shared. The owner's display name can appear publicly; set it in Settings. Anyone holding the link can view its public items. Manage and stop links from Settings. Revoking a link prevents future access but cannot retract screenshots or copies someone already made.

## About and version

Settings → App shows About DayFlow, the release version, and an expandable What’s new summary. The displayed version is read from `package.json`, so it reflects the website build you are using. The App section also contains installation and update guidance. The version number is not a live update check; use the update prompt or reopen the app to load a newer deployment.

## Reminders and device settings

Set the profile timezone first, then assign a reminder lead time to scheduled tasks or routines. Completed tasks, paused routines, and skipped occurrences are not reminder candidates. Moved occurrences use their effective date/time.

Browser reminders need DayFlow running. Push requires the separate server setup and an enrolled browser/device; enable it on each device that should receive reminders. Disable removes that device's enrollment. Do not assume a successful permission prompt alone proves automatic push delivery: test a future task after closing the tab.

Delivery also depends on device/browser support, notification permission, connectivity, and operating-system settings. PWA install support is present, but offline editing and guaranteed delivery while the browser is fully quit are not promised. See [push setup](PUSH-REMINDERS.md).

## Feedback and issue reports

Settings → App → Send feedback or report an issue opens the in-app form. Signed-in users can submit feedback, a bug report, or a feature request. A reply email is optional; it is never taken from the account automatically. App version is attached on the server. Task titles, notes, passwords, and browser diagnostics are not attached.

Apply `20261027000100_feedback.sql` with `pnpm exec supabase db push`. Submissions are stored in `public.feedback`; only database administrators can read them in the Supabase Dashboard. Users cannot read, edit, delete, or directly insert feedback. The authenticated RPC derives the owner and enforces one submission per minute and five per hour, including concurrent requests.

Email setup (server environment only, both `.env.local` and Vercel):

- `RESEND_API_KEY`: a Resend sending API key.
- `FEEDBACK_FROM_EMAIL`: your verified sender, for example `DayFlow <feedback@your-domain.com>`.
- `FEEDBACK_TO_EMAIL`: the inbox receiving feedback. Change this setting and redeploy to change the recipient; no migration is needed.

Restart the dev server after changing local environment settings, and redeploy after changing Vercel settings. Do not prefix these variables with `NEXT_PUBLIC_` or commit their values. See [Resend's Send Email API](https://resend.com/docs/api-reference/emails/send-email).

The database save happens before the email request. Reply-To uses the optional email entered in the form. An email failure does not lose feedback or tell the user to resubmit: the app confirms receipt after saving and logs the feedback reference plus failure status (without message content or secrets). Check server logs and the feedback table if an email is missing. After a successful submission, Send another message opens a fresh form; rate limits still apply. Automatic email retries, attachments, and an admin inbox are not included yet. The public `/privacy` page explains storage, sharing, notifications, email processing, retention limits, and the contact for data requests. It is linked from Login and Settings → App.

Release check: apply the migration, configure all three environment values, submit one report, verify the row in Supabase and receipt in the developer inbox, check Reply-To with an explicitly entered address, and confirm another account cannot access the record. No real email is sent by automated tests.

## Delete your account

Settings → Security → Delete account is permanent. Export your timetable from the planner first if you want a copy. Request a verification code, check your account email, enter the six-digit code, and type exactly `DELETE`. The final action checks the code before deleting anything. Both password and Google accounts use the same verified-email flow; this is not an automatic login or password-reset code.

Apply `20261027000200_account_deletion.sql` and then `20261027000300_account_deletion_otp.sql`. The latter removes the older sign-in-only deletion function, so it cannot bypass OTP. Configure server-only `SUPABASE_SECRET_KEY` (Sensitive in Vercel), along with the existing `RESEND_API_KEY` and verified `FEEDBACK_FROM_EMAIL`. Restart locally or redeploy after environment changes. The sender key must permit the selected verified domain. No recipient is accepted from the browser: the server reads the authenticated user and the database resolves the verified account email.

The application server registers a cryptographically random six-digit code’s salted SHA-256 hash using a privileged Supabase client that never receives user cookies. The code is not returned to the browser or logged. It expires after 10 minutes; five incorrect attempts lock it. Resend has a 60-second cooldown and five-per-hour account limit, including failed email attempts and across sign-out. A resend invalidates the previous code. Only a successfully accepted email activates the challenge. Challenges are private, bound to the Auth session, and invalidated by an account-email change. Deletion locks the challenge row so concurrent guesses cannot bypass attempt limits. Wrong-code counts commit; successful deletion and all cascades are atomic. No target-user argument exists on the deletion RPC.

Deletion removes the Auth user and sessions, profile, categories, tasks, routines, routine exceptions, share links, push subscriptions, linked delivery attempts, stored feedback, deletion challenge, and legacy reminder deduplication keys. Downloaded exports, screenshots, sent support emails, and provider backups are not erased. A notification already in transit can still arrive. Local notification cleanup is best-effort after deletion; its failure does not invite the user to repeat a destructive action. The UI clears the local session and returns to Login after success.

Only test actual deletion using an account explicitly designated as disposable. Automated tests use an in-memory PostgreSQL database with fake Auth users and cover cascades, rollback, isolation, code expiry/attempt limits, request limits, session/email binding, unsent codes, old-function removal, and replay. They do not send real email or execute hosted Auth deletions. Without the migration and all server settings, the UI stays unavailable and offers support.
