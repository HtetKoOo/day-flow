import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  isReminderDue,
  localClock,
  nextDate,
  reminderKey,
} from "../supabase/functions/_shared/reminders";

test("Reminders cover the lead-in window and stop at the task start", () => {
  const due = (minute: number) =>
    isReminderDue("2026-10-19", "10:00:00", 5, { date: "2026-10-19", minute });
  assert.equal(due(594), false);
  assert.equal(due(595), true);
  assert.equal(due(599), true);
  assert.equal(due(600), false);
  assert.equal(
    isReminderDue("2026-10-19", "10:00", 0, {
      date: "2026-10-19",
      minute: 599,
    }),
    false,
  );
});

test("Tomorrow's reminder is due before midnight across month and year boundaries", () => {
  assert.equal(
    isReminderDue("2027-01-01", "00:05", 10, {
      date: "2026-12-31",
      minute: 1435,
    }),
    true,
  );
  assert.equal(
    isReminderDue("2027-01-01", "00:05", 10, {
      date: "2026-12-31",
      minute: 1434,
    }),
    false,
  );
  assert.equal(
    isReminderDue("2027-01-01", "00:05", 10, { date: "2027-01-01", minute: 5 }),
    false,
  );
  assert.equal(nextDate("2026-12-31"), "2027-01-01");
  assert.equal(nextDate("2028-02-28"), "2028-02-29");
});

test("Timezone clock and shared notification keys stay consistent", () => {
  assert.deepEqual(
    localClock("Asia/Bangkok", new Date("2026-12-31T16:55:00Z")),
    { date: "2026-12-31", minute: 1435 },
  );
  assert.equal(
    reminderKey("task:abc", "2026-10-19", "10:00:00", 5),
    reminderKey("task:abc", "2026-10-19", "10:00", 5),
  );
});

test("Database claims isolate devices, retry failures and expired leases, and protect sent deliveries", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.push_subscriptions(id uuid primary key);
      insert into public.push_subscriptions values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261019000100_reliable_push_deliveries.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const device = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    const claim = async (key: string, id = device) =>
      (
        await db.query<{ token: string | null }>(
          "select public.claim_push_reminder($1, $2) as token",
          [key, id],
        )
      ).rows[0].token;
    const first = await claim("retry");
    assert.ok(first);
    assert.equal(
      await claim("retry"),
      null,
      "Overlapping cron must not acquire a live claim",
    );
    assert.ok(
      await claim("retry", other),
      "Other device can deliver independently",
    );
    await db.exec(
      "update public.push_reminder_attempts set status='failed', next_attempt_at=now()+interval '1 minute'",
    );
    assert.equal(await claim("retry"), null, "Retry respects backoff");
    await db.exec(
      "update public.push_reminder_attempts set next_attempt_at=now()-interval '1 second'",
    );
    const retried = await claim("retry");
    assert.ok(retried);
    assert.notEqual(retried, first);
    const stale = await db.query(
      "update public.push_reminder_attempts set status='sent' where claim_token=$1 returning *",
      [first],
    );
    assert.equal(
      stale.rows.length,
      0,
      "Old worker cannot mark a new claim sent",
    );
    await db.query(
      "update public.push_reminder_attempts set status='sent' where claim_token=$1",
      [retried],
    );
    assert.equal(
      await claim("retry"),
      null,
      "Sent device must never be retried",
    );
    await claim("crash");
    await db.exec(
      "update public.push_reminder_attempts set lease_until=now()-interval '1 second' where reminder_key='crash'",
    );
    assert.ok(await claim("crash"), "Crashed worker lease can be recovered");
    await db.exec(
      "update public.push_reminder_attempts set status='failed', attempts=5, next_attempt_at=now()-interval '1 second' where reminder_key='crash'",
    );
    assert.equal(await claim("crash"), null, "Retry limit is bounded");
    await db.exec("set role authenticated");
    await assert.rejects(() => claim("forbidden"));
    await assert.rejects(() =>
      db.query("select * from public.push_reminder_attempts"),
    );
    await db.exec("reset role; set role service_role");
    assert.ok(await claim("service"));
  } finally {
    await db.close();
  }
});
