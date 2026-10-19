import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  buildIcsCalendar,
  parseIcsCalendar,
  readIcsCalendar,
  zonedInstant,
} from "../src/lib/calendar/ics";
import {
  calendarImportInput,
  calendarImportKey,
} from "../src/lib/calendar/import";

const calendar = (lines: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", ...lines, "END:VCALENDAR"].join("\r\n");
const event = (lines: string[]) => [
  "BEGIN:VEVENT",
  "UID:test@example.com",
  ...lines,
  "END:VEVENT",
];
const base = {
  id: "abc",
  title: "Study",
  notes: "Notes",
  date: "2026-10-19",
  startTime: "10:00",
  durationMinutes: 60,
  isPrivate: false,
};

test("Export UTC preserves the instant when imported into a different timezone", () => {
  const output = buildIcsCalendar([base], {
    timezone: "Asia/Bangkok",
    privateMode: "exclude",
    includeNotes: true,
  });
  assert.match(output, /DTSTART:20261019T030000Z/);
  assert.match(output, /DTEND:20261019T040000Z/);
  const imported = parseIcsCalendar(output, "Asia/Yangon");
  assert.equal(imported[0].startTime, "09:30");
  assert.equal(imported[0].durationMinutes, 60);
});

test("Import respects source TZID and destination date rollover", () => {
  const output = calendar(
    event([
      "DTSTART;TZID=America/New_York:20261019T230000",
      "DTEND;TZID=America/New_York:20261019T233000",
      "SUMMARY:Meeting",
    ]),
  );
  const [imported] = parseIcsCalendar(output, "Asia/Bangkok");
  assert.equal(imported.date, "2026-10-20");
  assert.equal(imported.startTime, "10:00");
  assert.equal(imported.durationMinutes, 30);
});

test("Floating events respect calendar timezone and support DURATION", () => {
  const output = calendar([
    "X-WR-TIMEZONE:Asia/Yangon",
    ...event(["DTSTART:20261019T100000", "DURATION:PT1H30M"]),
  ]);
  const [imported] = parseIcsCalendar(output, "Asia/Bangkok");
  assert.equal(imported.startTime, "10:30");
  assert.equal(imported.durationMinutes, 90);
});

test("Timezone conversion rejects nonexistent DST time and chooses earlier fall-back occurrence", () => {
  assert.throws(() => zonedInstant("2026-03-08", "02:30", "America/New_York"));
  assert.equal(
    zonedInstant("2026-11-01", "01:30", "America/New_York").toISOString(),
    "2026-11-01T05:30:00.000Z",
  );
  assert.equal(
    zonedInstant("2026-07-01", "10:00", "America/New_York").toISOString(),
    "2026-07-01T14:00:00.000Z",
  );
});

test("Private events are excluded or redacted without leaking notes", () => {
  const privateEvent = {
    ...base,
    isPrivate: true,
    title: "Secret title",
    notes: "Secret notes",
  };
  assert.doesNotMatch(
    buildIcsCalendar([privateEvent], {
      timezone: "UTC",
      privateMode: "exclude",
      includeNotes: true,
    }),
    /Secret/,
  );
  const busy = buildIcsCalendar([privateEvent], {
    timezone: "UTC",
    privateMode: "busy",
    includeNotes: true,
  });
  assert.match(busy, /SUMMARY:Busy/);
  assert.doesNotMatch(busy, /Secret/);
});

test("UTF-8 line folding and text escaping round-trip Burmese titles and notes", () => {
  const title = "စာဖတ်ချိန် ".repeat(10);
  const notes = "one, two; three\\four\nnext line";
  const output = buildIcsCalendar([{ ...base, title, notes }], {
    timezone: "UTC",
    privateMode: "details",
    includeNotes: true,
  });
  for (const line of output.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  const [imported] = parseIcsCalendar(output, "UTC");
  assert.equal(imported.title, title.trim());
  assert.equal(imported.notes, notes);
});

test("Unsupported recurrence, all-day, invalid dates, and overnight events are reported", () => {
  const output = calendar([
    ...event(["DTSTART:20261019T100000", "RRULE:FREQ=DAILY"]),
    ...event(["DTSTART;VALUE=DATE:20261019"]),
    ...event(["DTSTART:20260230T100000"]),
    ...event(["DTSTART:20261019T235000", "DTEND:20261020T003000"]),
  ]);
  const result = readIcsCalendar(output, "UTC");
  assert.equal(result.events.length, 0);
  assert.equal(result.skipped, 4);
  assert.throws(() => readIcsCalendar("not a calendar", "UTC"));
});

test("Duplicate UIDs are collapsed while separate recurrence instances remain distinct", () => {
  const result = readIcsCalendar(
    calendar([
      ...event(["DTSTART:20261019T100000"]),
      ...event(["DTSTART:20261019T100000"]),
      ...event(["DTSTART:20261020T100000", "RECURRENCE-ID:20261020T100000"]),
    ]),
    "UTC",
  );
  assert.equal(result.events.length, 2);
  assert.equal(result.duplicates, 1);
});

test("Import defaults to private, validates midnight, and produces stable identities", () => {
  const [parsed] = calendarImportInput.parse([
    {
      title: "Study",
      scheduled_date: "2026-10-19",
      start_time: "10:00",
      duration_minutes: 60,
    },
  ]);
  assert.equal(parsed.is_private, true);
  assert.equal(calendarImportKey(parsed).length, 64);
  assert.equal(
    calendarImportKey({ ...parsed, source_uid: "global-uid" }),
    calendarImportKey({
      ...parsed,
      source_uid: "global-uid",
      title: "Changed",
    }),
  );
  assert.notEqual(
    calendarImportKey(parsed),
    calendarImportKey({ ...parsed, start_time: "11:00" }),
  );
  assert.equal(
    calendarImportInput.safeParse([
      { ...parsed, start_time: "23:30", duration_minutes: 60 },
    ]).success,
    false,
  );
});

test("Database deduplicates import per owner without overwriting existing task edits", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create table public.tasks(id uuid primary key default gen_random_uuid(), user_id uuid not null, title text, is_private boolean)",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261019000200_calendar_import_identity.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const key = "a".repeat(64);
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    const insert = (owner: string) =>
      db.query(
        "insert into public.tasks(user_id,title,is_private,calendar_import_key) values ($1,'Imported',true,$2) on conflict(user_id,calendar_import_key) do nothing returning id",
        [owner, key],
      );
    assert.equal((await insert(a)).rows.length, 1);
    await db.query("update public.tasks set title='My edit' where user_id=$1", [
      a,
    ]);
    assert.equal((await insert(a)).rows.length, 0);
    assert.equal(
      (
        await db.query<{ title: string }>(
          "select title from public.tasks where user_id=$1",
          [a],
        )
      ).rows[0].title,
      "My edit",
    );
    assert.equal((await insert(b)).rows.length, 1);
  } finally {
    await db.close();
  }
});
