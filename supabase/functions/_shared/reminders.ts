export type LocalClock = { date: string; minute: number };

export function localClock(timezone: string, now = new Date()): LocalClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute),
  };
}

export function isReminderDue(
  date: string,
  time: string,
  minutes: number,
  now: LocalClock,
) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  const start = Date.parse(`${date}T00:00:00Z`) / 60000 + hour * 60 + minute;
  const current = Date.parse(`${now.date}T00:00:00Z`) / 60000 + now.minute;
  return minutes > 0 && current >= start - minutes && current < start;
}

export function nextDate(date: string) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
}

export function reminderKey(
  source: string,
  date: string,
  time: string,
  minutes: number,
) {
  return `${source}:${date}:${time.slice(0, 5)}:${minutes}`;
}
