# DayFlow — Plan tomorrow tonight

Tomorrow-first personal planner · Next.js + Supabase · Web App + PWA

This repository contains the **V1 foundation**, not the complete planner. It includes the Today/Tomorrow/Week shell, authentication wiring, database schema and RLS, PWA assets, and development setup. Task CRUD, drag/resize interactions, and recurring instance generation are tracked in the [V1 blueprint](docs/V1-BLUEPRINT.md).

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
