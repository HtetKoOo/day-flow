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
  const [message, setMessage] = useState(
    "Enable reminders on this device to receive them even after DayFlow is closed.",
  );
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let disposed = false;
    async function checkSubscription() {
      const registration = await navigator.serviceWorker?.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) return;
      // RLS only returns subscriptions belonging to the signed-in account.
      // Never upsert an endpoint that may still belong to a previous account.
      const { data, error } = await createClient()
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();
      if (disposed) return;
      setEnabled(!error && Boolean(data));
      setMessage(
        error
          ? "Could not check reminders. Please try enabling them again."
          : data
            ? "Push reminders are enabled on this device."
            : "Enable reminders to connect this device to your current account.",
      );
    }
    void checkSubscription().catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  async function enable() {
    if (pending) return;
    if (
      !publicKey ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setMessage(
        "Push notifications are not configured for this deployment yet.",
      );
      return;
    }
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission is needed for reminders.");
        return;
      }
      const client = createClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user)
        throw new Error("Please sign in again before enabling reminders.");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const { data: owned, error } = await client
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", auth.user.id)
          .eq("endpoint", subscription.endpoint)
          .maybeSingle();
        if (error)
          throw new Error("Could not check this device. Please try again.");
        if (owned) {
          setEnabled(true);
          setMessage("Push reminders are enabled on this device.");
          return;
        }
        // A previous account may own this endpoint. Retire it at the browser
        // push service, then register a fresh endpoint; do not change ownership.
        if (!(await subscription.unsubscribe()))
          throw new Error("Could not reconnect this device. Please try again.");
        subscription = null;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth)
        throw new Error("This browser could not create a push subscription.");
      const { error } = await client.from("push_subscriptions").insert({
        user_id: auth.user.id,
        endpoint: subscription.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      if (error) {
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error(
          "Could not connect this device to your account. Please try again.",
        );
      }
      setEnabled(true);
      setMessage("Push reminders are enabled on this device.");
    } catch (error) {
      setEnabled(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not enable push reminders. Please try again.",
      );
    } finally {
      setPending(false);
    }
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
              <p
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary/15 px-4 text-sm font-medium text-primary"
                role="status"
              >
                <Check size={16} /> Enabled on this device
              </p>
            ) : (
              <Button
                type="button"
                disabled={pending}
                onClick={() => void enable()}
              >
                {pending ? "Connecting…" : "Enable push reminders"}
              </Button>
            )}
            {enabled && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void sendTestNotification()}
              >
                Send test notification
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
