"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaState = {
  install: (() => Promise<void>) | null;
  installed: boolean;
  platform: "apple-mobile" | "mac" | "other";
};
const PwaContext = createContext<PwaState>({
  install: null,
  installed: false,
  platform: "other",
});
export const usePwa = () => useContext(PwaContext);

function subscribeDisplay(onChange: () => void) {
  const display = window.matchMedia("(display-mode: standalone)");
  display.addEventListener("change", onChange);
  return () => display.removeEventListener("change", onChange);
}
function standaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}
const subscribePlatform = () => () => {};
function platformSnapshot(): PwaState["platform"] {
  if (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
    return "apple-mobile";
  return /Mac/.test(navigator.platform) ? "mac" : "other";
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const platform = useSyncExternalStore(
    subscribePlatform,
    platformSnapshot,
    () => "other" as const,
  );
  const standalone = useSyncExternalStore(
    subscribeDisplay,
    standaloneSnapshot,
    () => false,
  );
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    function beforeInstall(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    function didInstall() {
      setInstalled(true);
      setPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", didInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", didInstall);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const cleanups: (() => void)[] = [];
    function showWaiting() {
      if (
        !disposed &&
        registration?.waiting &&
        navigator.serviceWorker.controller
      ) {
        setWaiting(registration.waiting);
        setDismissed(false);
      }
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((result) => {
        if (disposed) return;
        registration = result;
        showWaiting();
        function trackInstall() {
          const worker = result.installing;
          if (!worker) return;
          const changed = () => {
            if (worker.state === "installed") showWaiting();
          };
          worker.addEventListener("statechange", changed);
          cleanups.push(() =>
            worker.removeEventListener("statechange", changed),
          );
        }
        result.addEventListener("updatefound", trackInstall);
        cleanups.push(() =>
          result.removeEventListener("updatefound", trackInstall),
        );
        trackInstall();
      })
      .catch(() => {
        /* Website remains usable if registration is unavailable. */
      });
    const check = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void registration?.update().catch(() => {});
    };
    const interval = window.setInterval(check, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
    } finally {
      setPrompt(null);
    }
  }
  function update() {
    if (!waiting || updating) return;
    setUpdating(true);
    setUpdateError("");
    let finished = false;
    const cleanup = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      window.clearTimeout(timeout);
    };
    const changed = () => {
      if (finished) return;
      finished = true;
      cleanup();
      window.location.reload();
    };
    const timeout = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      setUpdating(false);
      setUpdateError(
        "Update is taking longer than expected. Save your work, then reopen DayFlow.",
      );
    }, 15000);
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    if (waiting.state === "activated") changed();
    else waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  }

  return (
    <PwaContext.Provider
      value={{
        install: prompt ? install : null,
        installed: installed || standalone,
        platform,
      }}
    >
      {children}
      {waiting && !dismissed && (
        <aside
          role="status"
          className="fixed bottom-28 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-xl sm:bottom-6"
        >
          <p className="font-medium">A new DayFlow version is ready</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Save your changes in all open DayFlow windows before updating.
          </p>
          {updateError && (
            <p className="mt-2 text-sm text-destructive">{updateError}</p>
          )}
          <div className="mt-3 flex justify-end gap-3">
            <button
              type="button"
              className="text-button"
              disabled={updating}
              onClick={() => setDismissed(true)}
            >
              Later
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={updating}
              onClick={update}
            >
              {updating ? "Updating…" : "Update and reload"}
            </button>
          </div>
        </aside>
      )}
    </PwaContext.Provider>
  );
}
