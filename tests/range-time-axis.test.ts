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
