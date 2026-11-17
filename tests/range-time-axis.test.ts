import test from "node:test";
import assert from "node:assert/strict";
import { buildRangeTimeAxis } from "../src/components/planner/planner-time-axis";
import type { ScheduledTask } from "../src/lib/tasks/types";

test("Range clock includes late-night tasks instead of collapsing them at 22:00", () => {
  const tasks = [
    { start_time: "22:30", duration_minutes: 30 },
    { start_time: "23:30", duration_minutes: 5 },
  ] as ScheduledTask[];
  for (const compact of [false, true]) {
    const axis = buildRangeTimeAxis(tasks, compact);
    assert.equal(axis.end, 23 * 60 + 45);
    assert.ok(axis.positions[23 * 60 + 30] > axis.positions[22 * 60 + 30]);
    assert.ok(axis.height > axis.positions[23 * 60 + 30]);
    assert.equal(
      buildRangeTimeAxis(
        [{ start_time: "23:00", duration_minutes: 60 }] as ScheduledTask[],
        compact,
      ).end,
      1440,
    );
  }
});

test("Two-day and week clocks reserve space for consecutive tasks in the same 15-minute slot", () => {
  const tasks = [
    {
      id: "wake",
      scheduled_date: "2026-11-17",
      start_time: "07:30",
      duration_minutes: 5,
    },
    {
      id: "study",
      scheduled_date: "2026-11-17",
      start_time: "07:35",
      duration_minutes: 60,
    },
    {
      id: "early",
      scheduled_date: "2026-11-18",
      start_time: "05:00",
      duration_minutes: 5,
    },
  ] as ScheduledTask[];

  for (const compact of [false, true]) {
    const { start, positions } = buildRangeTimeAxis(tasks, compact);
    assert.equal(start, 300);
    assert.ok(positions[305] - positions[300] + 1e-6 >= (compact ? 46 : 56));
    assert.ok(positions[455] - positions[450] + 1e-6 >= (compact ? 46 : 56));
    assert.ok(positions[515] - positions[455] + 1e-6 >= (compact ? 66 : 88));
  }
});
