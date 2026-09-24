# DayFlow — Plan tomorrow tonight

Tomorrow-first personal planner: spend 5–10 minutes before bed planning tomorrow, then check off tasks the next day. Calm, clean, visual; inspired by timeline planning, not a clone.

## Locked scope

Email signup/login; Today, Tomorrow, day navigation and Week (inside /planner); Inbox; task add/edit/delete; start time and duration; drag Inbox tasks onto timeline; drag to reschedule; resize duration; completion; categories with color/icon; recurring tasks; notes; responsive desktop/mobile; installable PWA; strict per-user isolation.

Pages: / redirects by authentication, /login, /planner, /settings. /setup and /offline.html are technical setup/fallback routes.

Desktop: Inbox sidebar + timeline. Mobile: Planner/Inbox navigation and task bottom sheet. Week provides an overview and basic editing. Settings eventually includes account, day start/end, 12h/24h, week start, appearance, and account deletion.

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui component source, dnd-kit, Supabase PostgreSQL/Auth/RLS, Zod, date-fns. No ORM. Initial target Vercel. No paid API dependency.

## Foundation delivered

Dependencies and lockfile, email/password Auth wiring and session refresh, protected routes, responsive empty planner shell with date navigation, migration/RLS, task validation, public-only PWA offline fallback, environment template, CI, local Git.

## Remaining V1 implementation (not represented as completed)

- Category editor, profile/preferences forms; persisted Inbox CRUD and completion are implemented.
- Timeline drag/resize remains pending. Compact chronological tasks, mobile Planner/Inbox navigation, and task sheet are implemented.
- dnd-kit mouse/touch/keyboard scheduling and resizing (dependency installed).
- Week editing, recurring instance generation, recurrence edit/skip behavior.
- Account deletion with a narrowly scoped server endpoint. Light/Dark/System appearance is implemented.
- Auth UX hardening, password recovery, live two-account Supabase tests, device PWA QA.

## Database decisions

Four public tables: profiles, categories, tasks, recurring_tasks. auth.users owns profiles. Every child row has a non-null owner. Composite foreign keys prevent cross-user category/recurrence links. Profiles are created by an Auth trigger; clients can read/update their own profile but cannot insert/delete profiles directly.

Inbox requires both scheduled_date/start_time NULL. Scheduled tasks require both. Tasks finish by midnight; cross-midnight tasks must be split in V1. Completion requires a matching completed_at. Calendar days/times are wall-clock values interpreted in the profile's IANA timezone. Default UTC until profile timezone is selected. day_end 00:00 means midnight at the end of the day.

Recurrence V1: daily or weekly, interval, optional end date, weekday 0=Sunday..6=Saturday. recurring_tasks is authoritative; tasks.recurrence_rule is reserved compatibility metadata, not a second scheduler. recurring_task_id + occurrence_date uniquely identify an occurrence; occurrence_date stays fixed when a task moves. Generate bounded date windows idempotently in a later phase, not an always-running paid cron. Deactivate templates instead of deleting referenced templates. Skipped-occurrence/tombstone behavior must be implemented before generation goes live.

## V2 only

AI scheduling, calendar sync, push notifications, habits, analytics, social, attachments, teams, complex themes. Full offline editing/conflict resolution is not part of the PWA foundation.

## Inbox implementation

Inbox tasks now support title, notes, duration, editing, completion/reopening, and confirmed deletion through authenticated Server Actions. Ownership is derived from the verified session, fields are validated with Zod, and writes are constrained by owner and Inbox status in addition to RLS. The server reloads data after successful writes. The list shows up to 500 tasks with active tasks first and reports truncation. Live hosted UI verification remains a manual acceptance step.

## Date/time scheduling

Owner-scoped Server Actions set or clear schedule fields atomically, with Zod validation and midnight limits. Day/week queries are bounded by selected dates and profile week start; date selection persists in the URL. Exact start/end times are displayed; empty hours are compressed into clickable gaps. Scheduled tasks can be completed, reopened, rescheduled, or moved to Inbox. Overlapping tasks are labeled; drag/resize is pending. Inbox remains capped at 500 and selected schedules at 1,000 with visible truncation notices.

## UI/UX direction (implemented design pass)

Warm off-white / charcoal themes, soft ten-color task palette, generous rounding, quiet time guides, persistent desktop Inbox, mobile bottom navigation, and one modal/bottom-sheet editor. Theme preference is device-local. Tasks have independently persisted colors through an additive migration. Overlapping cards use lanes; minimum card size keeps short tasks selectable. Category color inheritance and drag/resize remain pending.

## Approved navigation and motion update

Today is the default on a fresh open; tomorrow planning remains one tap away, with an evening shortcut after 18:00 in the profile timezone. Day, 2 days, and Week are supported. Day uses a horizontally swipeable seven-day date strip, with one selected timeline below. 2 days shows the selected date and following date as headers joined with their matching timeline columns; Week expands that same pattern to seven columns. On narrow screens a date header and its task column scroll together. Calm transitions honor reduced motion, structural borders are removed, and completing a task does not reorder the Inbox.
