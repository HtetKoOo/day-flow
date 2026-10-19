# Push reminder setup and troubleshooting

The website subscribes devices; Supabase Cron invokes the Edge Function; the browser service worker displays received push messages. Website deployment alone does not configure the scheduler.

## 1. Generate matching VAPID keys

From the repository, with Node.js installed:

```sh
pnpm vapid:keys
```

Save the generated values securely. Use one matching pair across the website and sender:

| Location                          | Variable                       | Value                                                                 |
| --------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `.env.local` / Vercel environment | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generated application server public key                               |
| Supabase Edge Function secrets    | `VAPID_KEYS`                   | Complete generated JSON object containing publicKey and privateKey    |
| Supabase Edge Function secrets    | `VAPID_SUBJECT`                | A contact URI, e.g. `mailto:owner@example.com` using your own address |
| Supabase Edge Function secrets    | `CRON_SECRET`                  | A long random secret shared only with the scheduler                   |

Generate a cron secret locally with:

```sh
openssl rand -hex 32
```

Do not put the private JSON or cron secret in public environment variables, commits, screenshots, or chat. In the Supabase Dashboard, add secrets under Edge Functions → Secrets. Paste only the JSON value for `VAPID_KEYS`, not `VAPID_KEYS=` or Markdown formatting. The code uses `JSON.parse` on that value.

The function uses hosted `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` (the `default` key), falling back to `SUPABASE_SERVICE_ROLE_KEY`. These privileged credentials belong only in the server runtime; do not copy them into browser configuration.

Restart the local website after changing `.env.local`; rebuild/redeploy the website after changing Vercel public variables. Rotating the VAPID pair also requires devices to subscribe with the new public key.

## 2. Apply migrations and deploy the sender

Check the CLI is linked to the intended project, then run:

```sh
pnpm exec supabase migration list
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
pnpm exec supabase functions deploy send-reminders
```

The repository config has `[functions.send-reminders] verify_jwt = false`. The handler independently requires an exact `x-cron-secret` match. Do not disable authentication checks inside the handler.

The latest sender depends on the push-delivery and routine-occurrence migrations as well as the earlier subscription/reminder schema. Apply the entire pending migration history, not just a copied table definition.

## 3. Schedule the function

In Supabase enable the `pg_cron` and `pg_net` extensions if they are not installed, then create one Cron job:

| Field    | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| Name     | `send-dayflow-reminders`                                           |
| Schedule | `* * * * *` (every minute)                                         |
| Type     | HTTP Request                                                       |
| Method   | POST                                                               |
| URL      | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders` |
| Header   | `Content-Type`: `application/json`                                 |
| Header   | `x-cron-secret`: exactly the `CRON_SECRET` value from Edge secrets |
| Body     | `{}`                                                               |

The cron secret is not a Supabase JWT: do not substitute it into an Authorization Bearer header. Avoid duplicate schedules. Do not store a real secret in a migration file.

## 4. Verify end to end

1. Open Settings on the actual origin/device you intend to use and confirm the timezone.
2. Enable push reminders and grant browser notification permission.
3. Create a task starting more than five minutes in the future with a five-minute reminder.
4. Close the DayFlow tab while leaving the browser/device available to receive notifications.
5. Check Cron job history and Edge Function Invocations/Logs. Confirm a notification arrives before task start.
6. Repeat with a moved routine occurrence, and verify a skipped occurrence does not notify.
7. Disable push on this device and confirm it no longer receives server push. Test sign-out and switching accounts separately.

Localhost subscriptions and deployed-site subscriptions are separate. Enable push again on the deployed origin. A `200` function response confirms execution succeeded, not that the operating system displayed a notification; inspect `due`, `sent`, `failed`, `skipped`, and `expired` response counts.

## Troubleshooting

| Symptom                    | Check                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push not configured        | Public VAPID environment variable, then restart/rebuild website                                                                                             |
| Could not save device      | Current login, latest migrations/RLS, then explicitly re-enable enrollment; do not relax RLS                                                                |
| No invocations             | Cron job exists/enabled; `pg_cron` and `pg_net` installed                                                                                                   |
| `cron.job` missing         | Enable `pg_cron` before creating the job                                                                                                                    |
| `401`                      | Scheduler's `x-cron-secret` exactly matches Edge `CRON_SECRET`                                                                                              |
| `500`                      | Edge runtime Logs for that execution; invocation metadata alone does not contain the cause                                                                  |
| JSON parse error           | `VAPID_KEYS` is valid complete JSON; also verify server key configuration if the stack points there                                                         |
| `200`, no notification     | Response counts, future due task, timezone, completed/paused/skipped state, device enrollment, public/private key pairing, browser/OS notification settings |
| Repeated delivery attempts | Inspect device-specific claim states; failures retry only while due, up to five attempts                                                                    |

The sender stops considering a reminder at the task's start. An outage spanning the whole reminder window will not produce a late catch-up notification. Push acceptance is not proof of on-screen delivery or exact timing.
