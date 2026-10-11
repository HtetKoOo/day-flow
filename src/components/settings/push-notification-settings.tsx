"use client";

import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function keyBytes(key: string) {
  const value = key.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(value + padding);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushNotificationSettings() {
  const [message, setMessage] = useState("Enable reminders on this device to receive them even after DayFlow is closed.");
  const [enabled, setEnabled] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  async function saveSubscription(subscription: PushSubscription) {
    const json = subscription.toJSON();
    const { error } = await createClient().from("push_subscriptions").upsert({
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }, { onConflict: "endpoint" });

    if (error) {
      setEnabled(false);
      setMessage(`Could not save this device for push reminders: ${error.message}`);
      return false;
    }

    setEnabled(true);
    setMessage("Push reminders are enabled on this device.");
    return true;
  }

  useEffect(() => {
    navigator.serviceWorker?.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await saveSubscription(subscription);
    }).catch(() => undefined);
  }, []);

  async function enable() {
    if (!publicKey || !("PushManager" in window) || !("Notification" in window)) {
      setMessage("Push notifications are not configured for this deployment yet.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("Notification permission is needed for reminders.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    await saveSubscription(subscription);
  }

  async function sendTestNotification() {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("DayFlow reminder", {
        body: "Push reminders are working on this device.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "dayflow-reminder-test",
      });
      setMessage("Test notification sent.");
    } catch {
      setMessage("The browser could not show a test notification.");
    }
  }

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 text-primary" size={19} />
        <div className="min-w-0">
          <h2 className="font-medium">Push reminders</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {enabled ? (
              <p className="inline-flex h-10 items-center gap-2 rounded-md bg-primary/15 px-4 text-sm font-medium text-primary" role="status">
                <Check size={16} /> Enabled on this device
              </p>
            ) : (
              <Button type="button" onClick={() => void enable()}>
                Enable push reminders
              </Button>
            )}
            {enabled && (
              <Button type="button" variant="outline" onClick={() => void sendTestNotification()}>
                Send test notification
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
