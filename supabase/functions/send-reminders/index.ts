import * as webpush from "jsr:@negrel/webpush";
import { createClient } from "npm:@supabase/supabase-js@2";

type Subscription = { endpoint: string; p256dh: string; auth: string };
type Reminder = { source: string; userId: string; title: string; private: boolean; date: string; time: string; minutes: number };

function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  return keys ? JSON.parse(keys).default : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}
function localNow(timezone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) };
}
function minute(time: string) { const [hour, minutes] = time.slice(0, 5).split(":").map(Number); return hour * 60 + minutes; }
function due(date: string, time: string, reminder: number, now: { date: string; minute: number }) { return date === now.date && now.minute >= minute(time) - reminder && now.minute < minute(time); }

Deno.serve(async (request) => {
  if (request.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey());
  const [{ data: profiles }, { data: tasks }, { data: routines }] = await Promise.all([
    admin.from("profiles").select("id,timezone"),
    admin.from("tasks").select("id,user_id,title,is_private,scheduled_date,start_time,reminder_minutes,is_completed").not("reminder_minutes", "is", null).eq("is_completed", false),
    admin.from("recurring_tasks").select("id,user_id,title,is_private,start_time,reminder_minutes,days_of_week,starts_on,ends_on,is_active").not("reminder_minutes", "is", null).eq("is_active", true),
  ]);
  const zones = new Map((profiles ?? []).map((profile) => [profile.id, localNow(profile.timezone)]));
  const reminders: Reminder[] = [];
  for (const task of tasks ?? []) { const now = zones.get(task.user_id); if (now && task.scheduled_date && task.start_time && due(task.scheduled_date, task.start_time, task.reminder_minutes, now)) reminders.push({ source: `task:${task.id}`, userId: task.user_id, title: task.title, private: task.is_private, date: task.scheduled_date, time: task.start_time, minutes: task.reminder_minutes }); }
  for (const routine of routines ?? []) { const now = zones.get(routine.user_id); if (!now || !routine.start_time || (routine.starts_on && now.date < routine.starts_on) || (routine.ends_on && now.date > routine.ends_on)) continue; const weekday = new Date(`${now.date}T00:00:00Z`).getUTCDay(); if (routine.days_of_week?.includes(weekday) && due(now.date, routine.start_time, routine.reminder_minutes, now)) reminders.push({ source: `routine:${routine.id}`, userId: routine.user_id, title: routine.title, private: routine.is_private, date: now.date, time: routine.start_time, minutes: routine.reminder_minutes }); }
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(Deno.env.get("VAPID_KEYS")!));
  const server = await webpush.ApplicationServer.new({ contactInformation: Deno.env.get("VAPID_SUBJECT")!, vapidKeys });
  let sent = 0;
  for (const reminder of reminders) {
    const key = `${reminder.source}:${reminder.date}:${reminder.time}:${reminder.minutes}`;
    const { error: claimed } = await admin.from("push_reminder_deliveries").insert({ reminder_key: key });
    if (claimed) continue;
    const { data: subscriptions } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", reminder.userId);
    const body = reminder.private ? `A private task starts at ${reminder.time.slice(0, 5)}.` : `${reminder.title} starts at ${reminder.time.slice(0, 5)}.`;
    for (const subscription of (subscriptions ?? []) as Subscription[]) {
      try { await server.subscribe({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }).pushTextMessage(JSON.stringify({ title: "DayFlow reminder", body, tag: key, url: "/planner" }), { ttl: 300 }); sent++; }
      catch (error) { if (error instanceof webpush.PushMessageError && error.isGone()) await admin.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint); }
    }
  }
  return Response.json({ sent });
});
