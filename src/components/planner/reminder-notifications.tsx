"use client";

import { useEffect } from "react";
import type { ScheduledTask } from "@/lib/tasks/types";
import { minutes } from "@/lib/tasks/schedule";

function nowInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute),
  };
}

function reminderWasSent(key: string) {
  try {
    return sessionStorage.getItem(key) === "sent";
  } catch {
    return false;
  }
}

function markReminderSent(key: string) {
  try {
    sessionStorage.setItem(key, "sent");
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

    const checkReminders = () => {
      const now = nowInTimezone(timezone);
      for (const task of scheduled) {
        const reminder = task.reminder_minutes;
        if (
          task.is_completed ||
          !reminder ||
          task.scheduled_date !== now.date ||
          !task.start_time
        )
          continue;
        const start = minutes(task.start_time);
        if (now.minute < start - reminder || now.minute >= start) continue;

        const key = `dayflow-reminder:${task.id}:${task.scheduled_date}:${task.start_time}:${reminder}`;
        if (reminderWasSent(key)) continue;
        markReminderSent(key);
        const time = task.start_time.slice(0, 5);
        new Notification("DayFlow reminder", {
          body: task.is_private
            ? `A private task starts at ${time}.`
            : `${task.title} starts at ${time}.`,
          icon: "/icons/icon-192.png",
          tag: key,
        });
      }
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 15_000);
    window.addEventListener("focus", checkReminders);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkReminders);
    };
  }, [scheduled, timezone]);

  return null;
}
