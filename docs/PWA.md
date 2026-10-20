# PWA implementation, build, and testing

DayFlow is an installable online planner with a public offline fallback. Installing it does not enable offline task editing or guarantee notification delivery when the browser/OS is unavailable.

## Implementation

- `src/app/manifest.ts`: standalone app identity, scope, start URL, PNG icons, and a separate maskable icon. Existing Apple touch metadata remains in the root layout.
- `src/components/pwa/register.tsx`: root provider captures the browser install prompt, registers the worker, checks for updates on return to the page and hourly, and offers an explicit Update and reload action.
- `src/components/pwa/install-settings.tsx`: Settings → App shows an install button when the browser offers one; otherwise it gives platform-specific browser menu instructions. Running in an app window or receiving an installation event shows installed status. Browsers do not expose a universal way to detect an existing installation from an ordinary tab.
- `src/app/sw.js/route.ts` and `src/lib/pwa/worker.ts`: serve the worker at the existing `/sw.js` URL with no-cache headers. The build identifier is embedded in the script so a new release changes the worker bytes. `next.config.ts` uses the deployment ID, commit SHA, or a generated build ID. Roll out a single built artifact consistently across server replicas.
- The worker caches only the offline page and public brand assets. It does not intercept API/RSC requests or mutations and does not cache authenticated HTML or planner data. Navigation tries the network and falls back on network failure, rather than replacing HTTP errors with an offline page.

An installed worker waits for permission before activating an update. The notice asks users to save changes in all open windows. Only the tab where Update and reload was clicked reloads automatically; other tabs are not forcibly reloaded. Later dismisses the notice in that tab until another detection or page load. Unsaved drafts are not migrated between app versions.

The offline fallback becomes available after the first successful service worker installation while online. First-time visitors with no connection cannot download it.

## Build locally

```sh
pnpm install --frozen-lockfile
# Configure .env.local using .env.example without exposing server secrets.
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Open `http://localhost:3000`. Stop the development server first if it already uses that port. Localhost supports service worker testing; use HTTPS for the deployed site. Test production builds because development reload behavior differs.

If an agent sandbox blocks tsx's IPC, use `node --import tsx --test tests/*.test.ts`. If it blocks Turbopack's process/port binding, `pnpm exec next build --webpack` can verify an alternative production build. This is an environment workaround, not a replacement for testing the normal deployment build outside that sandbox.

No database migration or Edge Function redeploy is needed for these PWA UI/worker changes. Deploy the website build. Push still needs its existing separate [server setup](PUSH-REMINDERS.md).

## Manual verification

### Installation

1. Open the production origin online. Confirm `/manifest.webmanifest`, `/sw.js`, and all manifest icon URLs return successfully.
2. In Chromium DevTools → Application, inspect the manifest and active worker. Check for installability errors.
3. Open Settings → App. If an install prompt is available, install through the button; dismissing must leave the site usable.
4. On Safari, use the displayed Add to Dock/Home Screen instructions. Verify the icon and standalone window on the actual device. Installation cannot be completed in every embedded browser.
5. Reopen from the launcher and verify login, navigation, and Settings. Enable push separately on this origin/device and test actual delivery with the tab closed.

### Offline privacy

1. Let the worker finish installing while online, then reopen a page so it controls the tab.
2. Disable the network and navigate/reload: the reconnect page should appear, without task data.
3. In Cache Storage, verify only the named public assets are cached. No tasks, auth responses, or RSC payloads should be there.
4. Reconnect and choose Try again. The authenticated planner should load normally.

### Update lifecycle

1. Run release A and open an editable task in a controlled tab.
2. Build/deploy release B on the same origin. Return to the tab; a worker update check should detect it.
3. Verify the notice does not reload or discard the open draft. Later should dismiss it.
4. Save drafts in all open windows, then choose Update and reload. Verify the new worker activates and the page reloads once.
5. Check another tab: it must not be forcibly reloaded. Confirm push still works after activation.

Automated `tests/pwa.test.ts` checks actual PNG dimensions, separate maskable configuration, public-only cache population, explicit activation, cache cleanup isolation, network-first navigation, and exclusion of RSC/API/mutation requests. It does not replace real-browser installation and update testing.
