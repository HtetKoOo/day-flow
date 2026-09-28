import { timelineTaskHeight } from "@/components/planner/timeline";
import { minutes } from "@/lib/tasks/schedule";
import type { ScheduledTask } from "@/lib/tasks/types";

/**
 * Range columns share a visual clock. Fifteen-minute slots expand only where
 * a task needs enough room, while equal times remain aligned across days.
 */
export function buildRangeTimeAxis(tasks: ScheduledTask[], compact: boolean) {
  const start = 6 * 60;
  const end = 22 * 60;
  const slotHeights = new Map<number, number>();
  for (let minute = start; minute < end; minute += 15) slotHeights.set(minute, 12);

  for (const task of tasks) {
    const taskStart = Math.max(start, minutes(task.start_time));
    const taskEnd = Math.min(end, taskStart + task.duration_minutes);
    const first = Math.floor(taskStart / 15) * 15;
    const last = Math.ceil(taskEnd / 15) * 15;
    const slots = Math.max(1, (last - first) / 15);
    const minimumPerSlot = timelineTaskHeight(task.duration_minutes, compact) / slots;
    for (let minute = first; minute < last; minute += 15) {
      slotHeights.set(minute, Math.max(slotHeights.get(minute) ?? 12, minimumPerSlot));
    }
  }

  const positions: Record<number, number> = { [start]: 0 };
  let height = 0;
  for (let minute = start; minute < end; minute += 15) {
    height += slotHeights.get(minute) ?? 12;
    positions[minute + 15] = height;
  }
  return { start, end, positions, height };
}
