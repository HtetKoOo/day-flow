import { disconnectDeviceSubscription } from "./disconnect";
import { createClient } from "@/lib/supabase/client";

const preferenceKey = "dayflow-device-reminders-disabled";
export const deviceReminderEvent = "dayflow-device-reminders-change";

export function setDeviceRemindersDisabled(disabled: boolean) {
  localStorage.setItem(preferenceKey, disabled ? "true" : "false");
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
    if (authError || !data.user)
      throw new Error("Please sign in again to disconnect reminders.");
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
