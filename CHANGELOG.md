# Changelog

## 2.0.0 — Release candidate

### Added

- Calendar `.ics` import and export, timezone conversion, private imports by default, and duplicate detection.
- View-only timetable links that exclude private items and notes, with link management in Settings.
- One-day routine editing, moving, skipping, and restoring without changing the weekly rule.
- Browser and device-specific push reminders, timezone settings, and a scheduled Supabase sender with delivery tracking.
- Installable PWA with public offline fallback and explicit update/reload controls.
- App information with version and expandable release highlights.
- In-app feedback, bug reports, and feature requests with an optional reply email, protected storage, and developer email notifications.
- Public privacy policy linked from Login and Settings.
- Self-service account deletion in Settings → Security, protected by a session-bound email verification code, resend/attempt limits, and explicit DELETE confirmation.

### Improved

- Responsive planner header, Day / 2 days / Week layouts, timeline shapes and connectors, mobile Settings navigation, and form spacing.
- Settings navigation feedback, sign-out confirmation, and Save buttons that detect actual draft changes.
- Always-visible Plan tomorrow shortcut based on the profile timezone, with quiet evening emphasis and a dismissible reminder.
- Time picker uses its own modal scroll boundary and native scrolling, with larger touch targets, to address blocked swipes inside the mobile editor (physical iPhone retest pending).
- Consistent feedback dropdown styling and a Send another message action after submission.

### Limitations

- Internet is required for private timetable loading and editing; the PWA is not an offline planner.
- Notification delivery depends on device/browser settings and operating system behavior.
- The guided tomorrow-planning flow and persisted plan-ready status are deferred.
- Calendar import does not support all-day events, recurring rules, or overnight entries.
- Support email has no automatic retry queue. Account deletion requires a new database migration; support email copies and provider backups are outside its scope.

This entry is prepared for release. The Git tag and hosted release have not been published; see `docs/V2-RELEASE.md` for verification evidence and remaining device checks.
