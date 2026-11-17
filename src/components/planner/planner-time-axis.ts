import { agendaTasks } from "@/lib/tasks/agenda";
import { minutes } from "@/lib/tasks/schedule";
import type { ScheduledTask } from "@/lib/tasks/types";

export function timelineTaskHeight(minutes: number, compact: boolean) {
  const heights = compact
    ? [46, 54, 66, 82, 98, 112, 126]
    : [56, 66, 88, 110, 132, 150, 168];
  const position =
    minutes <= 15
      ? 0
      : minutes <= 30
        ? 1
        : Math.min(6, Math.ceil(minutes / 60) + 1);

  return heights[position];
}

export type RangeTimeAxis = {
  start: number;
  end: number;
  positions: number[];
  height: number;
};

/** Place exact task boundaries on one clock shared by all visible dates. */
export function buildRangeTimeAxis(
  tasks: ScheduledTask[],
  compact: boolean,
): RangeTimeAxis {
  const start = Math.min(
    6 * 60,
    ...tasks.map((task) => Math.floor(minutes(task.start_time) / 15) * 15),
  );
  const end = Math.min(
    1440,
    Math.max(
      22 * 60,
      ...tasks.map(
        (task) =>
          Math.ceil((minutes(task.start_time) + task.duration_minutes) / 15) *
          15,
      ),
    ),
  );

  const byDay = new Map<string, ScheduledTask[]>();
  for (const task of tasks) {
    const day = byDay.get(task.scheduled_date) ?? [];
    day.push(task);
    byDay.set(task.scheduled_date, day);
  }

  const constraints = new Map<number, { from: number; height: number }[]>();
  function reserve(from: number, to: number, height: number) {
    if (to <= from) return;
    const endingHere = constraints.get(to) ?? [];
    endingHere.push({ from, height });
    constraints.set(to, endingHere);
  }

  for (const day of byDay.values()) {
    const items = agendaTasks(day);
    if (items.some(({ overlaps }) => overlaps)) continue;
    for (const [index, { task, gap, gapStart }] of items.entries()) {
      const taskStart = minutes(task.start_time);
      reserve(
        taskStart,
        Math.min(end, taskStart + task.duration_minutes),
        timelineTaskHeight(task.duration_minutes, compact),
      );
      if (!compact && index > 0 && gap > 0) reserve(gapStart, taskStart, 32);
    }
  }

  // Each constraint ends after it starts. Apply them in time order so even
  // two events within the same five minutes get their full display height.
  const positions = Array<number>(end + 1).fill(0);
  for (let minute = start + 1; minute <= end; minute++) {
    positions[minute] = positions[minute - 1] + 0.45;
    for (const { from, height } of constraints.get(minute) ?? []) {
      positions[minute] = Math.max(positions[minute], positions[from] + height);
    }
  }
  return { start, end, positions, height: positions[end] };
}
