import { addDays, format, parseISO } from "date-fns";

export function tomorrowPlanningClock(timezone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  const today = `${values.year}-${values.month}-${values.day}`;
  return {
    today,
    tomorrow: format(addDays(parseISO(today), 1), "yyyy-MM-dd"),
    evening: Number(values.hour) >= 18,
  };
}
export function planningDismissalKey(userId: string) {
  return `dayflow-planning-dismissed:${userId}`;
}
