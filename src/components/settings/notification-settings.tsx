"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

type PermissionState = NotificationPermission | "unsupported";

function notificationPermission(): PermissionState {
  return "Notification" in window ? Notification.permission : "unsupported";
}

function noSubscription() {
  return () => undefined;
}

export function NotificationSettings() {
  const browserPermission = useSyncExternalStore(
    noSubscription,
    notificationPermission,
    () => "unsupported",
  );
  const [requestedPermission, setRequestedPermission] =
    useState<PermissionState | null>(null);
  const [message, setMessage] = useState("");
  const permission = requestedPermission ?? browserPermission;

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    setRequestedPermission(await Notification.requestPermission());
  }

  function sendTestNotification() {
    try {
      new Notification("DayFlow reminder", {
        body: "Notifications are working in this browser.",
        icon: "/icons/icon-192.png",
        tag: "dayflow-reminder-test",
      });
      setMessage("Test notification sent.");
    } catch {
      setMessage("The browser could not show a test notification.");
    }
  }

  const description =
    permission === "granted"
      ? "Reminders are enabled for this browser while DayFlow is open."
      : permission === "denied"
        ? "Notifications are blocked in your browser settings."
        : permission === "unsupported"
          ? "This browser does not support notifications."
          : "Enable notifications to receive task and routine reminders while DayFlow is open.";

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 text-primary" size={19} />
        <div className="min-w-0">
          <h2 className="font-medium">Reminders</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          {permission === "default" && (
            <Button className="mt-4" type="button" onClick={() => void enableNotifications()}>
              Enable notifications
            </Button>
          )}
          {permission === "granted" && (
            <Button
              className="mt-4"
              type="button"
              variant="outline"
              onClick={sendTestNotification}
            >
              Send test notification
            </Button>
          )}
          {message && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
