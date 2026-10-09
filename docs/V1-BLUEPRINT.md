# DayFlow V1 product scope

## Purpose

DayFlow helps one person make a realistic plan for tomorrow, then follow that plan without turning their day into a complex project-management system.

## V1 shipped scope

- Supabase email/password and Google authentication, confirmation, password reset, protected routes, and settings
- Inbox tasks: title, notes, duration, color, icon, edit, complete/reopen, and delete
- Timetable scheduling: day/time, free-gap add buttons, task editing, Inbox return, and conflict feedback
- Drag tasks from Inbox to the timetable and move scheduled tasks to another date/time
- Day, 2 days, and Week views; Today, arrows, and shareable URL state
- Weekly routines with selected days, start/end dates, durations, and future timetable appearances
- Instant optimistic feedback, Undo, and realtime task/routine updates across tabs and devices
- Responsive mobile/desktop interface and installable PWA shell
- Per-user database isolation through RLS

## V1 boundaries

- Routines are calculated for the visible date range; DayFlow does not materialize unlimited future task rows.
- Tasks and routines cannot cross midnight.
- Routines are timetable blocks, not completable task instances.
- History is retained. V1 does not automatically delete completed tasks.
- The PWA provides installability and a public offline fallback; it does not support offline task editing.
- Times use the profile timezone. Validate timezone changes carefully because scheduled dates/times are wall-clock values.

## V1 release criteria

The release is ready when a user can sign up, confirm an email, reset a password, sign in with Google, add an Inbox task, schedule and move it, complete it, create/edit a routine, navigate all planner views, and see changes update in another open tab. Each flow must work on the deployed URL and in Safari/mobile testing.

## V1.1 release scope

- Sync task create, edit, completion, deletion, and schedule changes across open tabs and devices.
- Sync routine create, edit, pause/resume, and deletion so generated timetable blocks stay current everywhere.
- Keep device-specific appearance preferences and unsaved editor drafts local.

## Deliberately deferred

- Calendar integrations and notifications
- Analytics and reports
- AI scheduling
- Attachments, collaboration, and teams
- Full offline editing and conflict resolution
- Routine exceptions and skip-one-occurrence controls
