# DayFlow v2.0.0

Release notes prepared for publication after the target environment and device checks in [the release checklist](V2-RELEASE.md). No release tag or deployment is created by this document.

DayFlow v2 makes it easier to plan tomorrow, adjust a routine for just one day, and share a timetable without exposing private items.

## What’s new

- Import and export calendar files with privacy choices and duplicate detection.
- Share a view-only timetable link and revoke it from Settings.
- Change, skip, move, and restore individual routine occurrences.
- Set timezone-aware reminders and enable push separately on each device.
- Install DayFlow as a PWA and accept updates when ready.
- Plan tomorrow at any time, with a quiet reminder in the evening.
- Send feedback or report an issue inside the app, with an optional reply email.
- Delete your account and stored planning data from Settings → Security after verifying an email code and confirming.
- Read the public privacy policy from Login or Settings → App.
- Use improved mobile planner views, navigation, Settings, and editor layouts.

## Upgrade and deployment

1. Apply pending Supabase migrations, including `20261027000100_feedback.sql` , `20261027000200_account_deletion.sql`, and `20261027000300_account_deletion_otp.sql`. Review the target project and migration history first.
2. Configure the website’s Supabase public settings, optional VAPID public key, and server-only `RESEND_API_KEY`, `FEEDBACK_FROM_EMAIL`, and `FEEDBACK_TO_EMAIL`. Account deletion OTP also requires server-only `SUPABASE_SECRET_KEY`.
3. If the deployed reminder function/shared code differs, deploy `send-reminders` with its matching VAPID and scheduler configuration. Website deployment alone does not configure push.
4. Deploy the website and smoke-test the production origin. Existing PWA installs should save drafts before accepting Update and reload.
5. After verification, commit/review final changes and create/publish `v2.0.0` through the normal release process.

## Known limits

An internet connection is required for timetable data. Push delivery depends on browser and OS support. Some calendar event types are not supported. Feedback survives email delivery failures, but email retries are manual. Self-service deletion removes the account and database records, but not support email copies or provider backups. See [the usage guide](V2-GUIDE.md) and [changelog](../CHANGELOG.md).
