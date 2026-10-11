"use client";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function keyBytes(key: string) {
  const value = key.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(value + padding);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushNotificationSettings() {
  const [message, setMessage] = useState("Push reminders can arrive after DayFlow is closed.");
  const [enabled, setEnabled] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    navigator.serviceWorker?.ready.then(async (registration) => {
      setEnabled(Boolean(await registration.pushManager.getSubscription()));
    }).catch(() => undefined);
  }, []);

  async function enable() {
    if (!publicKey || !("PushManager" in window) || !("Notification" in window)) {
      setMessage("Push notifications are not configured for this deployment yet.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setMessage("Notification permission is needed for reminders."); return; }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    const json = subscription.toJSON();
    const { error } = await createClient().from("push_subscriptions").upsert({ endpoint: subscription.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }, { onConflict: "endpoint" });
    if (error) { setMessage("Could not save this device for push reminders."); return; }
    setEnabled(true); setMessage("Push reminders are enabled on this device.");
  }

  return <section className="mt-6 rounded-3xl border bg-card p-6"><div className="flex items-start gap-3"><BellRing className="mt-0.5 text-primary" size={19}/><div><h2 className="font-medium">Push reminders</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button className="mt-4" type="button" onClick={() => void enable()} disabled={enabled}>{enabled ? "Enabled on this device" : "Enable push reminders"}</Button></div></div></section>;
}
