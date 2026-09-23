import test from "node:test";
import assert from "node:assert/strict";
import { taskSchema } from "../src/lib/validation/task";
const inbox = {
  title: "Study",
  scheduled_date: null,
  start_time: null,
  duration_minutes: 30,
  category_id: null,
};
test("Inbox and scheduled tasks are valid", () => {
  assert.ok(taskSchema.safeParse(inbox).success);
  assert.ok(
    taskSchema.safeParse({
      ...inbox,
      scheduled_date: "2026-09-24",
      start_time: "23:30",
    }).success,
  );
});
test("Reject partial schedules, invalid dates, blank titles, and midnight overflow", () => {
  for (const patch of [
    { start_time: "09:00" },
    { scheduled_date: "2026-09-24" },
    { title: "  " },
    { duration_minutes: 0 },
    { scheduled_date: "2026-02-30", start_time: "09:00" },
    { scheduled_date: "2026-09-24", start_time: "23:45" },
  ])
    assert.equal(taskSchema.safeParse({ ...inbox, ...patch }).success, false);
});
