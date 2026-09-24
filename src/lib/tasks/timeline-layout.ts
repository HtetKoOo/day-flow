import { minutes } from "./schedule";
import type { ScheduledTask } from "./types";
export const PIXELS_PER_MINUTE = 1.5;
export const MIN_CARD_MINUTES = 24;
// Assign lanes by visual intervals so even short, tappable cards never cover one another.
export function layoutTasks(tasks: ScheduledTask[]) {
  const sorted = tasks
    .map((task) => {
      const start = Math.min(minutes(task.start_time), 1440 - MIN_CARD_MINUTES);
      return {
        task,
        start,
        end: Math.min(
          1440,
          Math.max(
            minutes(task.start_time) + task.duration_minutes,
            start + MIN_CARD_MINUTES,
          ),
        ),
        lane: 0,
        lanes: 1,
      };
    })
    .sort(
      (a, b) =>
        a.start - b.start ||
        b.end - a.end ||
        a.task.id.localeCompare(b.task.id),
    );
  let group: typeof sorted = [];
  let groupEnd = -1;
  let laneEnds: number[] = [];
  function finish() {
    for (const item of group) item.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  }
  for (const item of sorted) {
    if (item.start >= groupEnd) {
      finish();
      groupEnd = -1;
    }
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane < 0) lane = laneEnds.length;
    item.lane = lane;
    laneEnds[lane] = item.end;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  finish();
  return sorted;
}
