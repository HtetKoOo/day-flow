import { minutes } from "./schedule";
import type { ScheduledTask } from "./types";
export function agendaTasks(tasks: ScheduledTask[]) {
  let occupiedUntil = 0;
  return [...tasks]
    .sort(
      (a, b) =>
        minutes(a.start_time) - minutes(b.start_time) ||
        a.id.localeCompare(b.id),
    )
    .map((task) => {
      const start = minutes(task.start_time);
      const gapStart = occupiedUntil;
      const gap = Math.max(0, start - occupiedUntil);
      const overlaps = start < occupiedUntil;
      occupiedUntil = Math.max(occupiedUntil, start + task.duration_minutes);
      return { task, gap, gapStart, overlaps };
    });
}
export function clockTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
