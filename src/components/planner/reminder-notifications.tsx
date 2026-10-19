"use client";

import { deviceRemindersDisabled } from "@/lib/notifications/device";
import { useEffect } from "react";
import type { ScheduledTask } from "@/lib/tasks/types";
import {
  isReminderDue,
  localClock,
  reminderKey,
} from "../../../supabase/functions/_shared/reminders";

function reminderWasSent(key: string) {
  try {
    return localStorage.getItem(key) === "sent";
  } catch {
    return false;
  }
}

function markReminderSent(key: string) {
  try {
    localStorage.setItem(key, "sent");
  } catch {
    // A notification can still be shown when browser storage is unavailable.
  }
}

export function ReminderNotifications({
  scheduled,
  timezone,
}: {
  scheduled: ScheduledTask[];
  timezone: string;
}) {
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;

    let checking = false;
    let disposed = false;
    const checkReminders = async () => {
      if (checking || disposed || deviceRemindersDisabled()) return;
      checking = true;
      try {
        // The push service owns notifications on subscribed devices, even while
        // this tab is open. Never run an independent local timer on those devices.
        const registration = await navigator.serviceWorker?.getRegistration();
        if (
          registration?.pushManager &&
          (await registration.pushManager.getSubscription())
        )
          return;
        if (disposed) return;
        const now = localClock(timezone);
        for (const task of scheduled) {
          const reminder = task.reminder_minutes;
          if (task.is_completed || !reminder || !task.start_time) continue;
          if (
            !isReminderDue(task.scheduled_date, task.start_time, reminder, now)
          )
            continue;
          const source = task.is_routine
            ? `routine:${task.routine_id}`
            : `task:${task.id}`;
          const tag = reminderKey(
            source,
            task.scheduled_date,
            task.start_time,
            reminder,
          );
          const key = `dayflow-reminder:${tag}`;
          const notify = () => {
            if (disposed || deviceRemindersDisabled() || reminderWasSent(key))
              return;
            const time = task.start_time!.slice(0, 5);
            new Notification("DayFlow reminder", {
              body: task.is_private
                ? `A private task starts at ${time}.`
                : `${task.title} starts at ${time}.`,
              icon: "/icons/icon-192.png",
              tag,
            });
            markReminderSent(key);
          };
          if (navigator.locks) {
            await navigator.locks.request(
              key,
              { ifAvailable: true },
              (lock) => {
                if (lock) notify();
              },
            );
          } else {
            notify();
          }
        }
      } catch {
        // A failed subscription check must not cause duplicate local alerts.
      } finally {
        checking = false;
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 15_000);
    window.addEventListener("focus", checkReminders);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", checkReminders);
    };
  }, [scheduled, timezone]);

  return null;
}
