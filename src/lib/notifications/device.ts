import { sessionHasEnded } from "@/lib/auth/session-status";
import { disconnectDeviceSubscription } from "./disconnect";
import { createClient } from "@/lib/supabase/client";

const preferenceKey = "dayflow-device-reminders-disabled";
export const deviceReminderEvent = "dayflow-device-reminders-change";

export function setDeviceRemindersDisabled(disabled: boolean) {
  try {
    localStorage.setItem(preferenceKey, disabled ? "true" : "false");
  } catch {
    /* Storage restrictions must not prevent logout. */
  }
  window.dispatchEvent(new Event(deviceReminderEvent));
}

export function deviceRemindersDisabled() {
  try {
    return localStorage.getItem(preferenceKey) === "true";
  } catch {
    return true;
  }
}

export async function disableDeviceReminders() {
  // Stop the in-tab fallback before removing push, including other open tabs.
  setDeviceRemindersDisabled(true);
  const registration = await navigator.serviceWorker?.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription) {
    const client = createClient();
    const { data, error: authError } = await client.auth.getUser();
    if (sessionHasEnded(authError, Boolean(data.user))) {
      // Account deletion already cascaded its database endpoints. Do not make
      // a dead session authenticate again just to leave the app.
      try {
        await subscription.unsubscribe();
      } catch {
        /* Best effort. */
      }
      try {
        (await registration?.getNotifications())?.forEach((notification) =>
          notification.close(),
        );
      } catch {
        /* Best effort. */
      }
      return;
    }
    if (authError || !data.user)
      throw new Error(
        "Could not check this device. Check your connection and try again.",
      );
    // Remove exactly this device and owner. Never remove every device on logout.
    await disconnectDeviceSubscription(
      subscription,
      async (endpoint) => {
        const { error } = await client
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint)
          .eq("user_id", data.user.id);
        if (error)
          throw new Error("Could not disconnect reminders. Please try again.");
      },
      async () => Boolean(await registration!.pushManager.getSubscription()),
    );
  }
  // Remove private reminders that are already visible on this device.
  const notifications = await registration?.getNotifications();
  notifications?.forEach((notification) => notification.close());
}
