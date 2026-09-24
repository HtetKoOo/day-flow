import test from "node:test";
import assert from "node:assert/strict";
import {
  scheduleInput,
  plannerRange,
  endTime,
} from "../src/lib/tasks/schedule";
const base = {
  id: "11111111-1111-4111-8111-111111111111",
  scheduled_date: "2026-09-24",
  start_time: "09:00",
  duration_minutes: 30,
};
test("Schedule accepts form duration and strips owner changes", () => {
  const value = scheduleInput.parse({
    ...base,
    duration_minutes: "30",
    user_id: "forged",
  });
  assert.deepEqual(value, base);
  assert.ok(
    scheduleInput.safeParse({ ...base, scheduled_date: null, start_time: null })
      .success,
  );
});
test("Scheduling validates complete date/time pairs and midnight boundaries", () => {
  for (const patch of [
    { scheduled_date: null },
    { start_time: null },
    { scheduled_date: "2026-02-30" },
    { start_time: "24:00" },
    { start_time: "23:45" },
    { duration_minutes: 0 },
    { duration_minutes: 5.5 },
  ])
    assert.equal(scheduleInput.safeParse({ ...base, ...patch }).success, false);
  assert.ok(scheduleInput.safeParse({ ...base, start_time: "23:30" }).success);
  assert.equal(endTime("23:30:00", 30), "24:00");
});
test("Date navigation defaults to today and respects week start", () => {
  assert.equal(
    plannerRange("2026-12-31", undefined, undefined).day,
    "2026-12-31",
  );
  assert.equal(
    plannerRange("2026-09-23", "invalid", undefined).day,
    "2026-09-23",
  );
  const week = plannerRange("2026-09-23", "2026-09-23", "week", 1);
  assert.equal(week.from, "2026-09-21");
  assert.equal(week.to, "2026-09-27");
  assert.equal(week.days.length, 7);
  assert.equal(
    plannerRange("2026-09-23", "2026-09-23", "week", 0).from,
    "2026-09-20",
  );
});

test("Two-day comparison crosses week, month, and year boundaries", () => {
  assert.deepEqual(plannerRange("2026-12-31", undefined, "two-days").days, [
    "2026-12-31",
    "2027-01-01",
  ]);
  assert.deepEqual(plannerRange("2026-09-27", "2026-09-27", "two-days").days, [
    "2026-09-27",
    "2026-09-28",
  ]);
  assert.equal(
    plannerRange("2026-09-24", "2026-10-02", "two-days").day,
    "2026-10-02",
  );
  assert.equal(plannerRange("2026-09-24", undefined, "invalid").days.length, 1);
});
