"use client";

import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  disableDeviceReminders,
  setDeviceRemindersDisabled,
} from "@/lib/notifications/device";
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
          setDeviceRemindersDisabled(false);
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
      setDeviceRemindersDisabled(false);
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

  async function disable() {
    if (pending) return;
    setPending(true);
    try {
      await disableDeviceReminders();
      setEnabled(false);
      setMessage(
        "Reminders are off on this device. Your other devices are unchanged.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not disable reminders. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border bg-card p-6">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 shrink-0 text-primary" size={19} />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Push reminders</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        {enabled && (
          <p
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
            role="status"
          >
            <Check size={16} className="shrink-0" /> Enabled on this device
          </p>
        )}
        <Button
          type="button"
          variant={enabled ? "outline" : "default"}
          className="min-h-11 w-full sm:w-auto"
          disabled={pending}
          onClick={() => void (enabled ? disable() : enable())}
        >
          {pending
            ? enabled
              ? "Disconnecting…"
              : "Connecting…"
            : enabled
              ? "Disable on this device"
              : "Enable push reminders"}
        </Button>
      </div>
    </section>
  );
}
