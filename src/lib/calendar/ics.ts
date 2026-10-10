export type CalendarExportEvent = {
  id: string;
  title: string;
  notes: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  isPrivate: boolean;
};

export type ImportedCalendarEvent = {
  id: string;
  title: string;
  notes: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  allDay: boolean;
};

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsDateTime(date: string, time: string) {
  return `${date.replaceAll("-", "")}T${time.replaceAll(":", "")}00`;
}

function utcStamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function endDateTime(date: string, time: string, durationMinutes: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const end = new Date(
    Date.UTC(year, month - 1, day, hour, minute + durationMinutes),
  );
  return `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, "0")}${String(end.getUTCDate()).padStart(2, "0")}T${String(end.getUTCHours()).padStart(2, "0")}${String(end.getUTCMinutes()).padStart(2, "0")}00`;
}

export function buildIcsCalendar(
  events: CalendarExportEvent[],
  options: {
    timezone: string;
    privateMode: "exclude" | "busy" | "details";
    includeNotes: boolean;
  },
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DayFlow//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-TIMEZONE:${escapeIcs(options.timezone)}`,
  ];
  for (const event of events) {
    if (event.isPrivate && options.privateMode === "exclude") continue;
    const busy = event.isPrivate && options.privateMode === "busy";
    lines.push(
      "BEGIN:VEVENT",
      `UID:dayflow-${event.id}@dayflow.local`,
      `DTSTAMP:${utcStamp()}`,
      `DTSTART:${icsDateTime(event.date, event.startTime)}`,
      `DTEND:${endDateTime(event.date, event.startTime, event.durationMinutes)}`,
      `SUMMARY:${escapeIcs(busy ? "Busy" : event.title)}`,
    );
    if (!busy && options.includeNotes && event.notes.trim())
      lines.push(`DESCRIPTION:${escapeIcs(event.notes)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

function unescapeIcs(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseDateTime(value: string) {
  const clean = value.trim();
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour = "09", minute = "00"] = match;
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    allDay: !clean.includes("T"),
    absoluteMinutes:
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
      ) / 60000,
  };
}

/** Parses the common iCalendar fields needed for a safe, editable import. */
export function parseIcsCalendar(source: string): ImportedCalendarEvent[] {
  const unfolded = source.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gim) ?? [];
  return blocks.flatMap((block, index) => {
    const fields = new Map<string, string>();
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      const key = line.slice(0, separator).split(";", 1)[0].toUpperCase();
      fields.set(key, line.slice(separator + 1));
    }
    const start = parseDateTime(fields.get("DTSTART") ?? "");
    if (!start) return [];
    const end = parseDateTime(fields.get("DTEND") ?? "");
    const duration = start.allDay
      ? 60
      : end
        ? Math.max(
            5,
            Math.min(
              1440,
              Math.round(end.absoluteMinutes - start.absoluteMinutes),
            ),
          )
        : 30;
    return [
      {
        id: fields.get("UID") ?? `import-${index}-${start.date}-${start.time}`,
        title:
          unescapeIcs(fields.get("SUMMARY") ?? "Untitled event").trim() ||
          "Untitled event",
        notes: unescapeIcs(fields.get("DESCRIPTION") ?? ""),
        date: start.date,
        startTime: start.time,
        durationMinutes: duration,
        allDay: start.allDay,
      },
    ];
  });
}
