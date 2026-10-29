# DayFlow v2.0.1

Status: prepared for release; not published by this change.

This patch improves sign-in guidance and profile settings.

## Changes

- Clearer login errors and guidance for accounts created with Google.
- Google sign-in requests account selection instead of relying on automatic selection.
- Saved display names and timezones remain visible with explicit Change, Save, and Cancel controls.
- Profile saves verify the returned database row before reporting success.
- Responsive settings layouts keep saved values readable and action buttons spaced.
- Proprietary source-available license and contribution documentation clarify permitted use.

## Before publication

1. Run lint, typecheck, tests, and the production build.
2. Check Settings read/edit/save/cancel at phone, tablet, and desktop widths; reload after saving to confirm persistence.
3. Test successful email login, incorrect credentials, and Google account selection. Test Google sign-in on a physical iPhone installed PWA, including the return to DayFlow.
4. Commit and push the reviewed changes, merge to the production branch, and verify the resulting Vercel deployment.
5. Mark the changelog entry released with the actual publication date, then publish a new GitHub tag/release `v2.0.1` for the verified commit. Preserve `v2.0.0`.

No database migration, new environment variable, or Supabase Edge Function deployment is required for these patch changes. Existing PWA users should save drafts before accepting an available update/reloading.

Physical iPhone PWA OAuth verification and production deployment verification remain manual release checks; requesting the Google chooser does not itself verify the complete device flow.
