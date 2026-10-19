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
  sourceUid?: string;
  recurrenceId?: string;
  title: string;
  notes: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  allDay: boolean;
};
type Property = { value: string; timezone?: string };

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
function unescapeIcs(value: string) {
  return value.replace(/\\([nN,;\\])/g, (_, char: string) =>
    char.toLowerCase() === "n" ? "\n" : char,
  );
}
function timestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}
function localParts(instant: Date, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    second: Number(values.second),
  };
}

/** Resolve wall-clock time in an IANA zone. Reject nonexistent DST times;
 * choose the earlier instant for an ambiguous fall-back time. */
export function zonedInstant(
  date: string,
  time: string,
  timezone: string,
  second = 0,
) {
  const wall = Date.parse(
    `${date}T${time.slice(0, 5)}:${String(second).padStart(2, "0")}Z`,
  );
  if (!Number.isFinite(wall)) throw new Error("Invalid calendar date.");
  const candidates = new Set<number>();
  for (const shift of [-36, -12, 0, 12, 36]) {
    const sample = wall + shift * 3600000;
    const local = localParts(new Date(sample), timezone);
    const offset =
      Date.parse(
        `${local.date}T${local.time}:${String(local.second).padStart(2, "0")}Z`,
      ) - sample;
    const instant = wall - offset;
    const actual = localParts(new Date(instant), timezone);
    if (
      actual.date === date &&
      actual.time === time.slice(0, 5) &&
      actual.second === second
    )
      candidates.add(instant);
  }
  if (!candidates.size)
    throw new Error("This time does not exist in its calendar timezone.");
  return new Date(Math.min(...candidates));
}

// RFC 5545 lines are folded at 75 UTF-8 octets, not 75 JavaScript characters.
function foldLine(value: string) {
  const lines: string[] = [];
  let line = "";
  let bytes = 0;
  for (const char of value) {
    const length = new TextEncoder().encode(char).length;
    if (bytes + length > 75) {
      lines.push(line);
      line = " ";
      bytes = 1;
    }
    line += char;
    bytes += length;
  }
  return [...lines, line].join("\r\n");
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
  ];
  for (const event of events) {
    if (event.isPrivate && options.privateMode === "exclude") continue;
    const busy = event.isPrivate && options.privateMode === "busy";
    const start = zonedInstant(event.date, event.startTime, options.timezone);
    lines.push(
      "BEGIN:VEVENT",
      `UID:dayflow-${event.id}@dayflow.local`,
      `DTSTAMP:${timestamp(new Date())}`,
      `DTSTART:${timestamp(start)}`,
      `DTEND:${timestamp(new Date(start.getTime() + event.durationMinutes * 60000))}`,
      `SUMMARY:${escapeIcs(busy ? "Busy" : event.title)}`,
      `CLASS:${event.isPrivate ? "PRIVATE" : "PUBLIC"}`,
    );
    if (!busy && options.includeNotes && event.notes.trim())
      lines.push(`DESCRIPTION:${escapeIcs(event.notes)}`);
    lines.push("END:VEVENT");
  }
  return [...lines, "END:VCALENDAR", ""].map(foldLine).join("\r\n");
}

function property(line: string): [string, Property] | null {
  const separator = line.indexOf(":");
  if (separator < 0) return null;
  const [name, ...parameters] = line.slice(0, separator).split(";");
  const timezone = parameters
    .find((param) => param.toUpperCase().startsWith("TZID="))
    ?.slice(5)
    .replace(/^"|"$/g, "");
  return [name.toUpperCase(), { value: line.slice(separator + 1), timezone }];
}
function parseDateTime(field: Property, floatingZone: string) {
  const match = field.value
    .trim()
    .match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) throw new Error("Only timed events are supported.");
  const [, year, month, day, hour, minute, second = "00", utc] = match;
  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}`;
  const check = new Date(`${date}T${time}:${second}Z`);
  if (
    !Number.isFinite(check.getTime()) ||
    check.toISOString().slice(0, 10) !== date ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    throw new Error("Invalid event date or time.");
  return utc
    ? check
    : zonedInstant(date, time, field.timezone ?? floatingZone, Number(second));
}

export function readIcsCalendar(source: string, timezone: string) {
  if (!/BEGIN:VCALENDAR/i.test(source) || !/END:VCALENDAR/i.test(source))
    throw new Error("Choose a valid .ics calendar file.");
  // Validate the destination timezone before processing any events.
  localParts(new Date(), timezone);
  const unfolded = source.replace(/\r?\n[ \t]/g, "");
  const calendarZone =
    unfolded.match(/^X-WR-TIMEZONE:(.+)$/im)?.[1].trim() ?? timezone;
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gim) ?? [];
  const events: ImportedCalendarEvent[] = [];
  let skipped = 0;
  let duplicates = 0;
  const seen = new Set<string>();
  for (const block of blocks) {
    try {
      const fields = new Map<string, Property>();
      let depth = 0;
      for (const line of block.split(/\r?\n/)) {
        if (/^BEGIN:/i.test(line)) {
          depth++;
          continue;
        }
        if (/^END:/i.test(line)) {
          depth--;
          continue;
        }
        // Nested alarms must not overwrite event properties.
        const parsed = depth === 1 ? property(line) : null;
        if (parsed) fields.set(...parsed);
      }
      if (
        fields.has("RRULE") ||
        fields.has("RDATE") ||
        fields.has("EXDATE") ||
        fields.get("STATUS")?.value === "CANCELLED"
      )
        throw new Error("Unsupported recurring event.");
      const startField = fields.get("DTSTART");
      if (!startField) throw new Error("Missing event start.");
      const start = parseDateTime(startField, calendarZone);
      const endField = fields.get("DTEND");
      let duration = 30;
      if (endField)
        duration =
          (parseDateTime(
            endField,
            startField.timezone ?? calendarZone,
          ).getTime() -
            start.getTime()) /
          60000;
      else if (fields.has("DURATION")) {
        const match = fields
          .get("DURATION")!
          .value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
        if (!match) throw new Error("Unsupported duration.");
        duration = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
      }
      const local = localParts(start, timezone);
      const [hour, minute] = local.time.split(":").map(Number);
      if (
        !Number.isInteger(duration) ||
        duration < 5 ||
        duration > 1440 ||
        hour * 60 + minute + duration > 1440
      )
        throw new Error("Event does not fit in a single day.");
      const title =
        unescapeIcs(fields.get("SUMMARY")?.value ?? "Untitled event").trim() ||
        "Untitled event";
      const notes = unescapeIcs(fields.get("DESCRIPTION")?.value ?? "");
      const uid = fields.get("UID")?.value;
      const recurrenceId = fields.get("RECURRENCE-ID")?.value;
      // No UID: fingerprint the event content instead of using its file position.
      const id = JSON.stringify(
        uid
          ? [uid, recurrenceId ?? ""]
          : [title, notes, local.date, local.time, duration],
      );
      if (seen.has(id)) {
        duplicates++;
        continue;
      }
      seen.add(id);
      events.push({
        id,
        sourceUid: uid,
        recurrenceId,
        title,
        notes,
        date: local.date,
        startTime: local.time,
        durationMinutes: duration,
        allDay: false,
      });
    } catch {
      skipped++;
    }
  }
  return { events, skipped, duplicates };
}

export function parseIcsCalendar(
  source: string,
  timezone = "UTC",
): ImportedCalendarEvent[] {
  return readIcsCalendar(source, timezone).events;
}
