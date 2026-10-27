"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { authExit } from "@/lib/auth/exit-coordinator";
import { sessionHasEnded } from "@/lib/auth/session-status";
import { clearEndedSession } from "@/app/auth/actions";
import { setDeviceRemindersDisabled } from "@/lib/notifications/device";

export function SessionGuard({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let checking = false;
    let leaving = false;
    let eventTimer: ReturnType<typeof setTimeout> | undefined;
    async function leave() {
      if (disposed || leaving || authExit.isActive()) return;
      leaving = true;
      setDeviceRemindersDisabled(true);
      // Stop displaying private cached UI even if a cleanup request fails.
      try {
        await clearEndedSession();
      } catch (error) {
        unstable_rethrow(error);
        // A hard navigation is only a fallback, not a second redirect after
        // the server action already navigated to Login.
        if (!disposed) window.location.replace("/login?session=ended");
      }
    }
    async function check() {
      if (
        disposed ||
        checking ||
        leaving ||
        authExit.isActive() ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      checking = true;
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (disposed || authExit.isActive()) return;
        if (sessionHasEnded(error, Boolean(user))) {
          await leave();
        } else if (!error && user && user.id !== userId) {
          // A different account signed in on another tab: reload its own data,
          // never clear that newly established session.
          window.location.reload();
        }
      } catch (error) {
        unstable_rethrow(error);
        /* Network errors are not evidence that an account was deleted. */
      } finally {
        checking = false;
      }
    }
    const listener = () => {
      void check();
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        clearTimeout(eventTimer);
        // Do not call Auth methods inside its locked state-change callback.
        eventTimer = setTimeout(listener, 0);
      }
    });
    window.addEventListener("focus", listener);
    window.addEventListener("online", listener);
    document.addEventListener("visibilitychange", listener);
    const interval = setInterval(listener, 60000);
    void check();
    return () => {
      disposed = true;
      clearTimeout(eventTimer);
      clearInterval(interval);
      subscription.unsubscribe();
      window.removeEventListener("focus", listener);
      window.removeEventListener("online", listener);
      document.removeEventListener("visibilitychange", listener);
    };
  }, [userId]);
  return null;
}
