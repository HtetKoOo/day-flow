import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  expandRoutine,
  type RoutineException,
} from "../supabase/functions/_shared/routine-occurrences";
import { routineExceptionsInRange } from "../src/lib/tasks/routines";
import { routineOccurrenceInput } from "../src/lib/validation/routine-occurrence";
import { isReminderDue } from "../supabase/functions/_shared/reminders";

const rule = {
  id: "routine",
  days_of_week: [1],
  starts_on: "2026-10-01",
  ends_on: "2026-12-31",
  is_active: true,
  start_time: "19:00",
  duration_minutes: 60,
};
const override: RoutineException = {
  recurring_task_id: "routine",
  occurrence_date: "2026-10-19",
  scheduled_date: "2026-10-19",
  start_time: "20:00",
  duration_minutes: 30,
  is_skipped: false,
};

test("One-day changes preserve the weekly rule and other occurrences", () => {
  const occurrences = expandRoutine(rule, "2026-10-19", "2026-10-26", [
    override,
  ]);
  assert.equal(occurrences.length, 2);
  assert.equal(occurrences[0].start_time, "20:00");
  assert.equal(occurrences[0].duration_minutes, 30);
  assert.equal(occurrences[1].start_time, "19:00");
  assert.equal(rule.start_time, "19:00");
  assert.equal(
    expandRoutine(rule, "2026-10-19", "2026-10-19", [])[0].start_time,
    "19:00",
    "Reset restores base schedule",
  );
});
test("Skipped days vanish and moved occurrences appear only on their effective date", () => {
  assert.equal(
    expandRoutine(rule, "2026-10-19", "2026-10-19", [
      { ...override, is_skipped: true },
    ]).length,
    0,
  );
  const moved = { ...override, scheduled_date: "2026-10-20" };
  assert.equal(
    expandRoutine(rule, "2026-10-19", "2026-10-19", [moved]).length,
    0,
  );
  assert.equal(
    expandRoutine(rule, "2026-10-20", "2026-10-20", [moved])[0].occurrence_date,
    "2026-10-19",
  );
  assert.equal(
    expandRoutine({ ...rule, is_active: false }, "2026-10-20", "2026-10-20", [
      moved,
    ]).length,
    0,
  );
  assert.equal(
    expandRoutine(rule, "2026-10-20", "2026-10-20", [
      { ...moved, recurring_task_id: "other" },
    ]).length,
    0,
  );
});
test("Invalidated originals are ignored after changing the series; occurrence input validates midnight", () => {
  assert.equal(
    expandRoutine({ ...rule, days_of_week: [2] }, "2026-10-20", "2026-10-20", [
      { ...override, scheduled_date: "2026-10-20" },
    ]).filter((item) => item.is_exception).length,
    0,
  );
  assert.equal(
    routineOccurrenceInput.safeParse({
      mode: "change",
      occurrence_date: "2026-10-19",
      scheduled_date: "2026-10-19",
      start_time: "23:30",
      duration_minutes: 60,
    }).success,
    false,
  );
  assert.equal(
    routineOccurrenceInput.safeParse({
      mode: "skip",
      occurrence_date: "invalid",
    }).success,
    false,
  );
});
test("Reminders use the override time and handle a moved early-morning occurrence", () => {
  const [changed] = expandRoutine(rule, "2026-10-19", "2026-10-19", [override]);
  assert.equal(
    isReminderDue(changed.scheduled_date, changed.start_time, 5, {
      date: "2026-10-19",
      minute: 19 * 60 + 55,
    }),
    true,
  );
  assert.equal(
    isReminderDue(changed.scheduled_date, changed.start_time, 5, {
      date: "2026-10-19",
      minute: 18 * 60 + 55,
    }),
    false,
  );
  const [moved] = expandRoutine(rule, "2026-10-19", "2026-10-20", [
    { ...override, scheduled_date: "2026-10-20", start_time: "00:05" },
  ]);
  assert.equal(
    isReminderDue(moved.scheduled_date, moved.start_time, 10, {
      date: "2026-10-19",
      minute: 1435,
    }),
    true,
  );
});

test("Shared SQL respects skip/move/reset/privacy and database prevents cross-account exceptions", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  const r = "33333333-3333-4333-8333-333333333333",
    token = "44444444-4444-4444-8444-444444444444";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as $$select current_setting('request.jwt.claim.sub')::uuid$$;
      create function public.touch_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
      create table public.profiles(id uuid primary key);
      insert into public.profiles values ('${a}'),('${b}');
      create table public.recurring_tasks(id uuid primary key,user_id uuid,title text,start_time time,duration_minutes integer,days_of_week integer[],starts_on date,ends_on date,is_active boolean,is_private boolean,color text,icon text);
      create table public.tasks(user_id uuid,scheduled_date date,start_time time,duration_minutes integer,title text,is_private boolean,color text,icon text);
      create table public.timetable_shares(token uuid,owner_id uuid,starts_on date,ends_on date,expires_at timestamptz);
      insert into public.recurring_tasks values ('${r}','${a}','Gym','19:00',60,array[1],'2026-10-01','2026-12-31',true,false,'sage','focus');
      insert into public.timetable_shares values ('${token}','${a}','2026-10-19','2026-10-20',null);`);
    for (const name of [
      "20260928000100_routine_exceptions.sql",
      "20261019000300_routine_occurrence_overrides.sql",
    ])
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    const shared = async () =>
      (
        await db.query<{ scheduled_date: string; start_time: string }>(
          "select scheduled_date::text,start_time::text from public.get_shared_timetable($1)",
          [token],
        )
      ).rows;
    assert.equal((await shared()).length, 1);
    await db.query(
      "insert into public.routine_exceptions(user_id,recurring_task_id,occurrence_date,scheduled_date,start_time,duration_minutes) values ($1,$2,'2026-10-19','2026-10-20','20:00',30)",
      [a, r],
    );
    const rows = await shared();
    assert.equal(rows.length, 1);
    assert.equal(String(rows[0].start_time), "20:00:00");
    assert.equal(String(rows[0].scheduled_date), "2026-10-20");
    await db.exec("update public.routine_exceptions set is_skipped=true");
    assert.equal((await shared()).length, 0);
    await db.exec("delete from public.routine_exceptions");
    assert.equal((await shared()).length, 1);
    await db.query(
      "insert into public.routine_exceptions(user_id,recurring_task_id,occurrence_date,scheduled_date,start_time,duration_minutes) values ($1,$2,'2026-10-12','2026-10-20','20:00',30)",
      [a, r],
    );
    assert.equal(
      (await shared()).length,
      2,
      "Moved-in occurrence from outside share range is included",
    );
    await db.exec("update public.recurring_tasks set is_private=true");
    assert.equal((await shared()).length, 0);
    await assert.rejects(() =>
      db.query(
        "insert into public.routine_exceptions(user_id,recurring_task_id,occurrence_date,is_skipped) values ($1,$2,'2026-10-26',true)",
        [b, r],
      ),
    );
    await assert.rejects(() =>
      db.query(
        "insert into public.routine_exceptions(user_id,recurring_task_id,occurrence_date,scheduled_date,start_time,duration_minutes) values ($1,$2,'2026-10-26','2026-10-26','23:30',60)",
        [a, r],
      ),
    );
  } finally {
    await db.close();
  }
});

test("Restore list excludes skipped days outside the visible week even when preloaded", () => {
  const skipped = {
    ...override,
    is_skipped: true,
    scheduled_date: null,
    start_time: null,
    duration_minutes: null,
  };
  assert.equal(
    routineExceptionsInRange([skipped], "2026-10-12", "2026-10-18").length,
    0,
  );
  assert.equal(
    routineExceptionsInRange([skipped], "2026-10-26", "2026-11-01").length,
    0,
  );
  assert.equal(
    routineExceptionsInRange([skipped], "2026-10-19", "2026-10-25").length,
    1,
  );
  assert.equal(
    routineExceptionsInRange([skipped], "2026-10-20", "2026-10-20").length,
    0,
  );
});
test("Restore list includes moved-in and moved-out changes only in their relevant ranges", () => {
  const moved = { ...override, scheduled_date: "2026-10-26" };
  assert.equal(
    routineExceptionsInRange([moved], "2026-10-19", "2026-10-25").length,
    1,
  );
  assert.equal(
    routineExceptionsInRange([moved], "2026-10-26", "2026-11-01").length,
    1,
  );
  assert.equal(
    routineExceptionsInRange([moved], "2026-11-02", "2026-11-08").length,
    0,
  );
  assert.equal(
    routineExceptionsInRange(
      [{ ...moved, is_skipped: true }],
      "2026-10-26",
      "2026-11-01",
    ).length,
    0,
  );
});
