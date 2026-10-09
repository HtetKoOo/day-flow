# DayFlow — Plan tomorrow tonight

DayFlow is a personal daily planner for making a calm plan tonight and following it tomorrow. It combines an Inbox, a visual timetable, recurring weekly routines, and fast Day / 2 days / Week views.

**Live app:** [dayflow.htetkooo.dev](https://dayflow.htetkooo.dev)
**Explore the demo:** [dayflow.htetkooo.dev/demo](https://dayflow.htetkooo.dev/demo)

![DayFlow daily planner with Inbox tasks and a visual timeline](public/images/demo-day.png)

## Live demo

Open [/demo](https://dayflow.htetkooo.dev/demo) to explore a complete sample plan without creating an account. Demo tasks and routines are generated around the viewer’s current date, and every change resets when the visitor leaves the page. Create an account to save personal data.

## Highlights

### Plan the whole week

![DayFlow Week view with recurring routines and scheduled work](public/images/demo-week.png)

### Edit tasks without losing your place

![DayFlow task editor with color, icon, time, and duration controls](public/images/demo-editor.png)

## What DayFlow does

- Email/password and Google authentication, email confirmation, password reset, and account settings
- Inbox tasks with title, notes, color, icon, duration, completion, and deletion
- Schedule tasks in the timetable, edit them, or return them to Inbox
- Drag tasks between Inbox and timetable; drag scheduled tasks to a new time
- Immediate UI updates with background server confirmation, Undo, and realtime task/routine sync across tabs and devices
- Day, 2 days, and Week views with URL-based navigation
- Weekly routines with chosen weekdays, start date, optional end date, start time, duration, and notes
- Responsive desktop and mobile UI, dark/light/system appearance, and PWA install support

## Stack

- Next.js App Router, React, TypeScript
- Supabase Auth, PostgreSQL, Row Level Security, and Realtime
- Resend SMTP for transactional authentication email and Google OAuth
- dnd-kit, date-fns, Zod, Radix UI, Lucide
- Vercel deployment and pnpm

## Local setup

**Requirements:** Node.js 24, pnpm 10, and a Supabase project.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Restart the development server after changing `.env.local`.

### Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

These browser-safe values identify the Supabase project. Do not add a service-role key, database password, or Supabase access token to `.env.local` or to Vercel’s public variables. RLS protects each user’s rows.

## Database and Supabase

Link the CLI once, then use migration files as the database source of truth:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

### Authentication configuration

For the deployed application, configure Supabase Auth with the following URLs:

- **Site URL:** `https://dayflow.htetkooo.dev`
- **Redirect URLs:** `https://dayflow.htetkooo.dev/**` and `http://localhost:3000/**`

The confirmation-email template must use `ConfirmationURL`, so local and production links both return to the correct callback route:

```html
<a href="{{ .ConfirmationURL }}"> Confirm your email </a>
```

Configure a custom SMTP provider before inviting real users. DayFlow uses Resend with a verified sending subdomain and a sender such as `DayFlow <no-reply@mail.htetkooo.dev>`. Store the Resend API key only in Supabase **Authentication → SMTP Settings**; never expose it in application environment variables.

To enable Google sign-in:

1. Create a Web OAuth client in Google Cloud.
2. Add `https://dayflow.htetkooo.dev` and `http://localhost:3000` as authorized JavaScript origins.
3. Copy the Supabase Google provider callback URL (`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`) into Google Cloud's authorized redirect URIs.
4. Enable Google in Supabase **Authentication → Providers**, then add the Google Client ID and Client Secret there.

Google and Resend secrets belong only in their respective provider dashboards.

For local Supabase development (Docker required):

```sh
pnpm db:start
pnpm db:reset
pnpm db:types
pnpm db:stop
```

`pnpm db:reset` only resets the local database. Never use it for production data.

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm build
```

`pnpm check` runs the lint, type, unit, and database checks together. `pnpm build` is the final production-build verification.

## Deploying to Vercel

1. Push the repository to GitHub. A private repository works.
2. Import the repository into Vercel with the Next.js preset.
3. Set Node.js 24, `pnpm install --frozen-lockfile` as the install command, and `pnpm build` as the build command.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production and Preview as appropriate.
5. Apply pending Supabase migrations with `pnpm exec supabase db push`.
6. Connect `dayflow.htetkooo.dev` in Vercel and configure its DNS records with the domain provider.
7. Update Supabase Auth Site URL and Redirect URLs, configure Resend SMTP, and enable Google OAuth.
8. Smoke-test email signup/confirmation, password reset, Google sign-in, planner navigation, drag/drop, routines, and task/routine edits in a second browser or device before release.

## Project map

```text
src/app/                     Routes and authenticated server actions
src/components/auth/         Login, signup, confirmation, and password recovery
src/components/planner/      Planner UI, editor components, and planner hooks
src/lib/tasks/               Schedule, routines, colors, and agenda utilities
src/lib/supabase/            Browser and server Supabase clients
src/lib/validation/          Zod schemas for server actions
supabase/migrations/         Versioned schema, policies, realtime, and planner data
scripts/test-rls.mjs         Database/RLS isolation checks
tests/                       Unit tests
public/                      PWA manifest, icons, and offline fallback
```

See [V1 product scope](docs/V1-BLUEPRINT.md) and [architecture & operations](docs/ARCHITECTURE.md) for product rules, data flow, and maintenance guidance.
