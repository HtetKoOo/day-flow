"use client";

import { useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";
import { usePwa } from "./register";

export function InstallSettings() {
  const { install, installed, platform } = usePwa();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function requestInstall() {
    if (!install || pending) return;
    setPending(true);
    setError("");
    try {
      await install();
    } catch {
      setError(
        "Could not open installation. Use your browser’s install menu instead.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <section className="mt-6 rounded-3xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <Download size={21} className="text-primary" />
          <h3 className="font-medium">Install DayFlow</h3>
        </div>
        {installed ? (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm">
            <CheckCircle2 size={18} className="text-primary" />
            DayFlow is installed or running in an app window.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Open DayFlow from your home screen, Dock, or Start menu in its own
              window.
            </p>
            {install ? (
              <button
                className="primary-button mt-5"
                type="button"
                disabled={pending}
                onClick={requestInstall}
              >
                {pending ? "Opening install…" : "Install DayFlow"}
              </button>
            ) : (
              <div className="mt-4 rounded-2xl bg-secondary p-4 text-sm leading-6">
                {platform === "apple-mobile" ? (
                  <p>
                    In Safari, open Share, choose Add to Home Screen, enable
                    Open as Web App if shown, then tap Add. If you’re in another
                    app’s browser, open this site in Safari first.
                  </p>
                ) : platform === "mac" ? (
                  <p>
                    In Safari, choose File → Add to Dock, then Add. In Chrome or
                    Edge, use the install option in the address bar or browser
                    menu when available.
                  </p>
                ) : (
                  <p>
                    In Chrome or Edge, look for Install DayFlow in the address
                    bar or browser menu. On Android, this may be called Add to
                    Home screen. If it isn’t available, you can continue using
                    DayFlow in this browser.
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="form-error mt-3">
            {error}
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Installation is optional. Enable push reminders separately on each
          device in Planning settings.
        </p>
      </section>
      <section className="mt-6 rounded-3xl border bg-card p-6">
        <h3 className="font-medium">Updates and offline use</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          When an update is ready, DayFlow offers Update and reload. Save
          changes in all open DayFlow windows first, or choose Later.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          An internet connection is required to load and save your timetable.
          Offline, DayFlow shows a reconnect page. Private tasks are not cached
          for offline browsing.
        </p>
      </section>
    </>
  );
}
