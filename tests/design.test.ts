import test from "node:test";
import assert from "node:assert/strict";
import { layoutTasks } from "../src/lib/tasks/timeline-layout";
import { taskColors, taskColor } from "../src/lib/tasks/colors";
import { editorInput } from "../src/lib/validation/editor";
import type { ScheduledTask } from "../src/lib/tasks/types";
function task(
  id: string,
  start_time: string,
  duration_minutes: number,
): ScheduledTask {
  return {
    id,
    title: id,
    notes: "",
    is_completed: false,
    scheduled_date: "2026-09-25",
    start_time,
    duration_minutes,
  };
}
test("Overlapping groups get independent non-overlapping lanes", () => {
  const layout = layoutTasks([
    task("a", "09:00", 120),
    task("b", "09:30", 30),
    task("c", "10:00", 60),
    task("d", "12:00", 30),
  ]);
  assert.equal(layout.find((x) => x.task.id === "a")?.lanes, 2);
  assert.equal(
    layout.find((x) => x.task.id === "b")?.lane,
    layout.find((x) => x.task.id === "c")?.lane,
  );
  assert.equal(layout.find((x) => x.task.id === "d")?.lanes, 1);
  for (const a of layout)
    for (const b of layout)
      if (a !== b && a.start < b.end && b.start < a.end)
        assert.notEqual(a.lane, b.lane);
});
test("Tiny late-night tasks remain visible and cannot overlap visually", () => {
  const layout = layoutTasks([task("a", "23:45", 5), task("b", "23:55", 5)]);
  for (const item of layout) {
    assert.ok(item.end <= 1440);
    assert.ok(item.end - item.start >= 24);
    assert.equal(item.lanes, 2);
  }
});
test("Exactly ten colors are accepted and arbitrary CSS is rejected", () => {
  assert.equal(taskColors.length, 10);
  assert.equal(taskColor("invalid"), "sage");
  const input = {
    title: "Read",
    notes: "",
    duration_minutes: "30",
    scheduled_date: null,
    start_time: null,
  };
  for (const color of taskColors)
    assert.ok(editorInput.safeParse({ ...input, color }).success);
  assert.equal(
    editorInput.safeParse({ ...input, color: "url(example.com)" }).success,
    false,
  );
  assert.equal(
    editorInput.safeParse({
      ...input,
      color: "sage",
      scheduled_date: "2026-09-25",
      start_time: "23:45",
    }).success,
    false,
  );
  const parsed = editorInput.parse({
    ...input,
    color: "rose",
    user_id: "forged",
    is_completed: true,
  });
  assert.equal("user_id" in parsed, false);
  assert.equal("is_completed" in parsed, false);
});

test("Agenda gaps respect overlapping tasks and preserve actual times", async () => {
  const { agendaTasks, clockTime } = await import("../src/lib/tasks/agenda");
  const items = agendaTasks([
    task("c", "12:00", 30),
    task("a", "09:00", 120),
    task("b", "09:30", 15),
  ]);
  assert.deepEqual(
    items.map((x) => x.task.id),
    ["a", "b", "c"],
  );
  assert.equal(items[1].overlaps, true);
  assert.equal(items[2].gapStart, 660);
  assert.equal(items[2].gap, 60);
  assert.equal(clockTime(items[2].gapStart), "11:00");
  assert.equal(agendaTasks([task("midnight", "00:00", 5)])[0].overlaps, false);
});
