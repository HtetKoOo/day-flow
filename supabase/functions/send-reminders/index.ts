import * as webpush from "jsr:@negrel/webpush";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  isReminderDue,
  localClock,
  nextDate,
  reminderKey,
} from "../_shared/reminders.ts";

type Reminder = {
  source: string;
  userId: string;
  title: string;
  private: boolean;
  date: string;
  time: string;
  minutes: number;
};

function requiredSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  return keys
    ? JSON.parse(keys).default
    : requiredSecret("SUPABASE_SERVICE_ROLE_KEY");
}
async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await page(from, from + 499);
    if (result.error) throw new Error("Reminder database query failed");
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return rows;
  }
}

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  try {
    const admin = createClient(requiredSecret("SUPABASE_URL"), secretKey());
    const [profiles, tasks, routines] = await Promise.all([
      allRows((from, to) =>
        admin
          .from("profiles")
          .select("id,timezone")
          .order("id")
          .range(from, to),
      ),
      allRows((from, to) =>
        admin
          .from("tasks")
          .select(
            "id,user_id,title,is_private,scheduled_date,start_time,reminder_minutes",
          )
          .not("reminder_minutes", "is", null)
          .eq("is_completed", false)
          .order("id")
          .range(from, to),
      ),
      allRows((from, to) =>
        admin
          .from("recurring_tasks")
          .select(
            "id,user_id,title,is_private,start_time,reminder_minutes,days_of_week,starts_on,ends_on",
          )
          .not("reminder_minutes", "is", null)
          .eq("is_active", true)
          .order("id")
          .range(from, to),
      ),
    ]);
    const instant = new Date();
    const zones = new Map(
      profiles.map((profile) => [
        profile.id,
        localClock(profile.timezone, instant),
      ]),
    );
    const reminders: Reminder[] = [];
    for (const task of tasks) {
      const now = zones.get(task.user_id);
      if (
        now &&
        task.scheduled_date &&
        task.start_time &&
        isReminderDue(
          task.scheduled_date,
          task.start_time,
          task.reminder_minutes,
          now,
        )
      )
        reminders.push({
          source: `task:${task.id}`,
          userId: task.user_id,
          title: task.title,
          private: task.is_private,
          date: task.scheduled_date,
          time: task.start_time,
          minutes: task.reminder_minutes,
        });
    }
    for (const routine of routines) {
      const now = zones.get(routine.user_id);
      if (!now || !routine.start_time) continue;
      // Tomorrow's early routines can become due before today's midnight.
      for (const date of [now.date, nextDate(now.date)]) {
        if (
          (routine.starts_on && date < routine.starts_on) ||
          (routine.ends_on && date > routine.ends_on)
        )
          continue;
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        if (
          routine.days_of_week?.includes(weekday) &&
          isReminderDue(date, routine.start_time, routine.reminder_minutes, now)
        )
          reminders.push({
            source: `routine:${routine.id}`,
            userId: routine.user_id,
            title: routine.title,
            private: routine.is_private,
            date,
            time: routine.start_time,
            minutes: routine.reminder_minutes,
          });
      }
    }
    const vapidKeys = await webpush.importVapidKeys(
      JSON.parse(requiredSecret("VAPID_KEYS")),
    );
    const server = await webpush.ApplicationServer.new({
      contactInformation: requiredSecret("VAPID_SUBJECT"),
      vapidKeys,
    });
    const counts = {
      due: reminders.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      expired: 0,
    };
    for (const reminder of reminders) {
      const key = reminderKey(
        reminder.source,
        reminder.date,
        reminder.time,
        reminder.minutes,
      );
      const subscriptions = await allRows((from, to) =>
        admin
          .from("push_subscriptions")
          .select("id,endpoint,p256dh,auth")
          .eq("user_id", reminder.userId)
          .order("id")
          .range(from, to),
      );
      for (const subscription of subscriptions) {
        const { data: token, error: claimError } = await admin.rpc(
          "claim_push_reminder",
          { p_key: key, p_subscription: subscription.id },
        );
        if (claimError) throw new Error("Reminder claim failed");
        if (!token) {
          counts.skipped++;
          continue;
        }
        const body = reminder.private
          ? `A private task starts at ${reminder.time.slice(0, 5)}.`
          : `${reminder.title} starts at ${reminder.time.slice(0, 5)}.`;
        let status = "sent";
        let errorCode: string | null = null;
        try {
          await server
            .subscribe({
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            })
            .pushTextMessage(
              JSON.stringify({
                title: "DayFlow reminder",
                body,
                tag: key,
                url: "/planner",
              }),
              { ttl: 300 },
            );
          counts.sent++;
        } catch (error) {
          if (error instanceof webpush.PushMessageError && error.isGone()) {
            const { error: deleteError } = await admin
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
            if (deleteError)
              throw new Error("Expired subscription cleanup failed");
            counts.expired++;
            continue;
          }
          status = "failed";
          errorCode = "push_send_failed";
          counts.failed++;
          // Never log subscription credentials, task titles, or private payloads.
          console.error("Push delivery failed; retry scheduled");
        }
        const { error: updateError } = await admin
          .from("push_reminder_attempts")
          .update({
            status,
            error_code: errorCode,
            sent_at: status === "sent" ? new Date().toISOString() : null,
            next_attempt_at: new Date(Date.now() + 60000).toISOString(),
          })
          .eq("reminder_key", key)
          .eq("subscription_id", subscription.id)
          .eq("claim_token", token);
        if (updateError)
          throw new Error("Reminder delivery status update failed");
      }
    }
    console.info("Reminder run", counts);
    return Response.json(counts);
  } catch {
    console.error(
      "Reminder run failed; check database migrations and function configuration",
    );
    return Response.json({ error: "Reminder run failed" }, { status: 500 });
  }
});
