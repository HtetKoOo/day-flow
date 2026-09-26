# DayFlow — Plan tomorrow tonight

Tomorrow-first personal planner · Next.js + Supabase · Web App + PWA

This repository contains the **V1 foundation**, not the complete planner. It includes the Day/2 days/Week planner shell, authentication wiring, database schema and RLS, PWA assets, and development setup. Persistent Inbox task CRUD and completion are implemented. Timeline scheduling, drag/resize interactions, and recurring instance generation are tracked in the [V1 blueprint](docs/V1-BLUEPRINT.md).

## 1. Local development

Use Node.js 24 LTS and pnpm 10.26.2. The pnpm version is pinned in `package.json`. If pnpm is not installed, install it using the [official installation guide](https://pnpm.io/installation).

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Without Supabase environment values, the app shows the setup page. Restart the development server after changing `.env.local`.

Use pnpm for dependency changes and commit `pnpm-lock.yaml` alongside `package.json`. The repository's `pnpm-workspace.yaml` explicitly allows installation scripts for esbuild, sharp, the Supabase CLI, and the ESLint import resolver.

```text
src/app/                Routes, Auth actions, manifest
src/components/ui/      shadcn/ui registry components (locally owned)
src/components/planner/ Responsive foundation shell
src/lib/supabase/       Browser/server clients
src/lib/validation/     Zod input validation
supabase/migrations/   Versioned schema, constraints, RLS
scripts/test-rls.mjs    PostgreSQL isolation tests
public/                PWA worker, icons, offline page
```

## 2. Supabase Free project

1. Create a Free project in the Supabase dashboard. Keep its database password in a password manager.
2. Run `supabase/migrations/20260923000100_dayflow_foundation.sql` once in the SQL Editor, or use the CLI migration workflow below. Do not apply the same migration through both methods.
3. Copy the **Project URL** and **publishable key** from the Connect dialog into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
4. Under Auth → URL Configuration, set the Site URL to `http://localhost:3000` for local development. Change it to the production HTTPS URL after deployment.
5. Enable email/password signup and email confirmation. Use the following link in the Confirm signup email template:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

The confirmation link establishes a session and redirects to `/planner`. Supabase's default email delivery has testing restrictions; check its SMTP requirements before opening signup to other users. Any custom SMTP free tier is subject to the provider's limits.

CLI workflow (the project reference is not a secret):

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

Never put access tokens or database passwords in source code, chat, or commits. The app does not need a service-role key. The browser publishable key is public; **RLS** protects user data. Git ignores `.env*` files except `.env.example`.

## 3. Local database (optional; Docker required)

```sh
pnpm db:start
pnpm db:reset
pnpm db:types
pnpm db:stop
```

`db:reset` deletes local data and reapplies migrations. Do not use it against production. Put the local CLI's URL and publishable key in `.env.local`, and test confirmation emails through the local Inbucket UI. Once the local stack is running, `db:types` generates database types; connecting those types to the client generics remains part of the data-layer implementation.

## 4. Checks

```sh
pnpm check
pnpm build
pnpm start
```

To check or apply formatting:

```sh
pnpm format:check
pnpm format
```

Database tests apply the migration to PGlite (a real PostgreSQL engine) with mocked Supabase Auth schema and roles. They cover two-user CRUD isolation, anonymous access denial, cross-owner relationships, constraints, and recurring occurrence uniqueness. These tests do not replace hosted Supabase/Auth integration testing. After connecting a hosted project, test signup, confirmation, login, signout, and isolation with two accounts.

CI installs dependencies with `pnpm install --frozen-lockfile`, runs checks, and builds the app.

## 5. PWA foundation

Open a production build over HTTPS or localhost and use the browser's Install / Add to Home Screen option. The foundation includes a manifest, 192/512 PNG icons, a maskable icon, an Apple icon, and a service worker.

The worker caches **only public offline fallback assets**. It does not cache private tasks, Auth responses, or sessions. Offline editing is not implemented. The worker is not registered in development mode.

## 6. Vercel deployment

1. Push the repository to your Git host. No remote is configured by this setup.
2. Import it into Vercel with the Next.js preset, Node 24.x, and the repository root as the project directory.
3. Use `pnpm install --frozen-lockfile` as the install command and `pnpm build` as the build command. Keep the pinned `packageManager` field and `pnpm-lock.yaml` in the repository.
4. Set both public Supabase environment variables in the Vercel project settings.
5. After deployment, update the Supabase Site URL to the production URL. Use local Supabase for local testing to avoid mixing local and production confirmation URLs.
6. Test signup, confirmation, login, logout, user isolation, installation, and offline behavior. Use a separate test environment for preview deployments.

The project targets personal use within free-tier limits. Vercel Hobby is intended for personal/non-commercial use, and Supabase Free has quotas and pausing limits. No custom domain, paid AI API, or paid cron service is required. This is not a guarantee of permanent free hosting or a production SLA.

## Official references

- [pnpm installation](https://pnpm.io/installation)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase pricing](https://supabase.com/pricing)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)

## Try the Inbox

1. Sign in and choose **Add task** in the Inbox. Enter a title, duration, and optional notes.
2. Save, then refresh: the task should remain because it is stored in Supabase.
3. Edit the task; use its checkbox to complete it or reopen it in place.
4. Choose Delete and confirm to remove a disposable test task.

In Supabase Table Editor, an Inbox row has your Auth user ID and null `scheduled_date`/`start_time`. Completion updates `is_completed` and `completed_at` together. Never edit `user_id` to assign tasks through the UI. Existing RLS policies enforce ownership. No additional migration is needed for Inbox CRUD.

## Schedule a task

Click an Inbox task, choose **Set a time**, enter its date, start time, and duration, then save. The app opens that day and the task leaves the Inbox. Day, 2 days, Week, and date navigation load the selected date range from Supabase; the URL preserves your selection on refresh.

Click a task to reschedule it, or select **Inbox** in the editor to clear both date and start time. Completion also works on scheduled tasks. Times are interpreted in the displayed profile timezone (UTC by default); timezone settings UI is still pending. Tasks must end by midnight. Tasks appear in a compact chronological list with exact times. Overlaps are labeled and free gaps can be clicked to schedule a task. Duration resizing remains a later phase.

Use the grip on an Inbox or scheduled task to drag it to a day. While dragging, that day's half-hour targets appear; drop on a labeled time to save through the authenticated schedule action. Touch users can hold the grip to start. Escape cancels, and dropping outside the targets leaves the schedule unchanged. The task stays in place until the server confirms saving; Undo restores its previous date/time (or returns it to Inbox). For exact minute times or duration edits, use the task editor. Scheduling alone needs no color migration; color edits require the migration below.

## Design update: themes and task colors

Apply **only** `supabase/migrations/20260924000100_task_colors.sql` once in the hosted SQL Editor before saving through the redesigned task editor. This adds a constrained `color` column; existing tasks default to sage and ownership policies are unchanged. Do not rerun the foundation migration. Existing tasks can still be read before applying this update; saves show an actionable error until it is applied.

- Light, Dark, and System (default) are available in Settings → Appearance. The preference is saved in this browser, not synced between accounts/devices.
- Each task has one of ten preset colors, with separate light/dark palettes. Click a card to open one editor for title, schedule, duration, notes, and color. Category inheritance is not yet implemented.
- Desktop/tablet widths above 760px show Inbox beside the timeline. Smaller screens use Planner/Inbox bottom navigation and a bottom sheet.
- Completion controls remain visible on day cards. Delete is inside the editor with explicit confirmation. Unsaved edits require discard confirmation when closing.
- The compact timeline compresses empty hours. Day has a swipeable seven-day navigator and one selected-day timeline. 2 days and Week place their date headers directly above their matching timeline columns, so dates and tasks scroll together on smaller screens. Each date shows up to three task-color dots and an overflow count. Inbox visibility is saved in this browser.

Manual acceptance: apply the color migration, change a real task's color, refresh, and check it persists. Test an Inbox-to-scheduled save on mobile, theme persistence after reload, and account isolation. Layout and editor interactions were checked with disposable preview fixtures; no hosted user data was modified during visual QA.

### Visual style

DayFlow uses a system sans-serif font, larger task titles, neutral light/dark surfaces, and a lavender accent. Appearance settings offer Light, Dark, and System. The planner prioritizes dates and tasks with minimal supporting text.

### Calm navigation and daily defaults

Opening `/planner` without a date shows Today in the profile timezone. An explicit URL date remains selected. The 2 days view compares that date with the following day, including across week/month/year boundaries; mobile uses horizontal swipe with snapping. After 18:00 in the profile timezone, Today shows a quiet “Plan tomorrow” link. This never changes the selected day automatically.

Inbox opens/closes with a 260ms transition and remembers its visibility. Hidden desktop Inbox controls are removed from keyboard navigation. Reduced-motion preferences disable animation. Completed tasks stay in place; Inbox order follows creation time instead of completion status. Editing within the current range preserves the view and scroll position; moving a task outside it opens the new date in the same view.

### Compact calendar layout

The planner toolbar contains month context, previous/next controls, Today, view selection, and Settings. Branding stays off the planning surface. Day uses a horizontally swipeable seven-day date navigator and one selected-date timeline. 2 days shows two date headers joined with their two timeline columns, and Week expands that same layout to seven columns. On small screens each range column scrolls horizontally together with its own date header. Inbox has one toggle label and remembers its visibility.
