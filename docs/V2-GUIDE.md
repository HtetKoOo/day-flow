# DayFlow V2 guide

This guide describes implemented behavior, not a guarantee that every deployment has its required migrations and secrets installed.

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

## Reminders and device settings

Set the profile timezone first, then assign a reminder lead time to scheduled tasks or routines. Completed tasks, paused routines, and skipped occurrences are not reminder candidates. Moved occurrences use their effective date/time.

Browser reminders need DayFlow running. Push requires the separate server setup and an enrolled browser/device; enable it on each device that should receive reminders. Disable removes that device's enrollment. Do not assume a successful permission prompt alone proves automatic push delivery: test a future task after closing the tab.

Delivery also depends on device/browser support, notification permission, connectivity, and operating-system settings. PWA install support is present, but offline editing and guaranteed delivery while the browser is fully quit are not promised. See [push setup](PUSH-REMINDERS.md).
