"use client";
import { Plus, Check, Link2, Sunrise, Coffee, Moon, ListChecks } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { endTime, minutes } from "@/lib/tasks/schedule";
import { agendaTasks, clockTime } from "@/lib/tasks/agenda";
import { taskColor } from "@/lib/tasks/colors";
import { DraggableTaskCard } from "./drag-schedule";
import type { InboxTask, ScheduledTask } from "@/lib/tasks/types";

function timelineMarker(task: ScheduledTask) {
  const title = task.title.toLocaleLowerCase();
  if (/wake|morning/.test(title)) return { icon: Sunrise, moment: true };
  if (/breakfast|lunch|dinner|coffee|meal/.test(title)) return { icon: Coffee, moment: true };
  if (/sleep|bed|night/.test(title)) return { icon: Moon, moment: true };
  return { icon: ListChecks, moment: task.duration_minutes <= 15 };
}

function durationHeight(minutes: number, compact: boolean) {
  const heights = compact
    ? [46, 54, 66, 82, 98, 112, 126]
    : [54, 66, 88, 110, 132, 150, 168];
  const position =
    minutes <= 15 ? 0 : minutes <= 30 ? 1 : Math.min(6, Math.ceil(minutes / 60) + 1);

  return `${heights[position]}px`;
}

function durationClass(minutes: number) {
  if (minutes <= 15) return "is-quarter-hour";
  if (minutes <= 30) return "is-half-hour";
  return "";
}

function gapHeight(minutes: number, compact: boolean) {
  const minimum = compact ? 18 : 26;
  const maximum = compact ? 42 : 74;
  const scale = compact ? 0.18 : 0.28;

  return `${Math.round(Math.min(maximum, Math.max(minimum, minutes * scale)))}px`;
}
export function Timeline({
  day,
  tasks,
  onEdit,
  onAdd,
  onComplete,
  pending,
  compact = false,
  draggingTask = null,
  dragTime = null,
}: {
  day: string;
  tasks: ScheduledTask[];
  onEdit: (task: ScheduledTask) => void;
  onAdd: (time: string) => void;
  onComplete: (task: ScheduledTask) => void;
  pending: boolean;
  compact?: boolean;
  draggingTask?: InboxTask | null;
  dragTime?: string | null;
}) {
  const { setNodeRef } = useDroppable({
    id: `timeline-surface-${day}`,
    data: { day },
  });
  const items = agendaTasks(tasks);
  const finish = Math.max(
    0,
    ...tasks.map((t) => minutes(t.start_time) + t.duration_minutes),
  );
  const firstStart = Math.min(
    24 * 60,
    ...tasks.map((task) => minutes(task.start_time)),
  );
  const startOffset = tasks.length
    ? gapHeight(Math.max(0, firstStart - 8 * 60), compact)
    : "0px";
  const targetMinute = dragTime ? minutes(dragTime) : null;
  const previewTop = targetMinute === null ? 0 : Math.max(0, Math.min(100, ((targetMinute - 6 * 60) / (16 * 60)) * 100));
  const targetEnd = targetMinute === null || !draggingTask
    ? null
    : targetMinute + draggingTask.duration_minutes;
  const hasDropConflict = targetEnd !== null && tasks.some((task) =>
    targetMinute! < minutes(task.start_time) + task.duration_minutes &&
    targetEnd > minutes(task.start_time),
  );
  return (
    <div
      ref={setNodeRef}
      className={`agenda ${compact ? "agenda-compact" : ""} ${draggingTask ? "agenda-dragging" : ""}`}
      style={{ "--agenda-start-offset": startOffset } as React.CSSProperties}
    >
      {draggingTask && targetMinute !== null && (
        <div
          className="agenda-insertion-guide"
          data-color={taskColor(draggingTask.color)}
          data-conflict={hasDropConflict || undefined}
          style={{
            "--agenda-guide-top": `${previewTop}%`,
          } as React.CSSProperties}
          aria-hidden="true"
        >
          <span>{dragTime}</span>
        </div>
      )}
      {items.map(({ task, gap, gapStart }, index) => {
        const previousTask = items[index - 1]?.task;
        const taskStart = minutes(task.start_time);
        const overlapsPrevious = items.slice(0, index).some(({ task: other }) =>
          taskStart < minutes(other.start_time) + other.duration_minutes,
        );
        const overlapsNext = items.slice(index + 1).some(({ task: other }) =>
          taskStart + task.duration_minutes > minutes(other.start_time),
        );
        const hasOverlap = overlapsPrevious || overlapsNext;
        const isContiguous = index > 0 && gap === 0 && !overlapsPrevious;
        const nextGap = items[index + 1]?.gap ?? 0;
        const marker = timelineMarker(task);
        const MarkerIcon = marker.icon;
        return <div
          key={task.id}
          className={`agenda-item ${overlapsPrevious ? "has-previous-overlap" : ""} ${overlapsNext ? "has-next-overlap" : ""} ${isContiguous ? "is-contiguous" : ""} ${nextGap > 0 ? "has-next-gap" : ""}`}
          style={nextGap > 0 ? ({ "--timeline-next-gap": gapHeight(nextGap, compact) } as React.CSSProperties) : undefined}
        >
          {gap > 0 && index > 0 && (
            draggingTask ? (
              <div
                className="agenda-gap agenda-gap-visible"
                style={{ "--agenda-gap-height": gapHeight(gap, compact) } as React.CSSProperties}
                aria-hidden="true"
              >
                <span
                  className="timeline-connector"
                  data-from-color={taskColor(previousTask?.color)}
                  data-to-color={taskColor(task.color)}
                />
                <span className="agenda-gap-add" aria-hidden="true">
                  <Plus size={14} />
                </span>
                <span>
                  Free · {gap >= 60 ? `${Math.floor(gap / 60)}h` : ""}
                  {gap % 60 ? ` ${gap % 60}m` : ""}
                </span>
              </div>
            ) : (
              <div
                className="agenda-gap"
                style={{ "--agenda-gap-height": gapHeight(gap, compact) } as React.CSSProperties}
              >
                <span
                  className="timeline-connector"
                  data-from-color={taskColor(previousTask?.color)}
                  data-to-color={taskColor(task.color)}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="agenda-gap-add"
                  onClick={() => onAdd(clockTime(gapStart))}
                  aria-label={`Add task between ${clockTime(gapStart)} and ${task.start_time.slice(0, 5)}`}
                >
                  <Plus size={14} />
                </button>
                <span>
                  Free · {gap >= 60 ? `${Math.floor(gap / 60)}h` : ""}
                  {gap % 60 ? ` ${gap % 60}m` : ""}
                </span>
              </div>
            )
          )}
          <DraggableTaskCard
            task={task}
            disabled={pending || compact}
            className={`agenda-card ${durationClass(task.duration_minutes)} ${marker.moment ? "is-moment" : "is-duration"} ${task.is_completed ? "is-complete" : ""} ${hasOverlap ? "has-overlap" : ""} ${targetEnd !== null && targetMinute! < minutes(task.start_time) + task.duration_minutes && targetEnd > minutes(task.start_time) ? "is-drop-conflict" : ""}`}
            data-color={taskColor(task.color)}
            title={compact ? `${task.title}, ${task.start_time.slice(0, 5)} to ${endTime(task.start_time, task.duration_minutes)}` : undefined}
            aria-label={compact ? `${task.title}, ${task.start_time.slice(0, 5)} to ${endTime(task.start_time, task.duration_minutes)}` : undefined}
            style={{
              viewTransitionName: `dayflow-task-${task.id}`,
              "--agenda-task-height": durationHeight(task.duration_minutes, compact),
            } as React.CSSProperties}
          >
            <span className="timeline-time" aria-hidden="true">
              {task.start_time.slice(0, 5)}
            </span>
            <span className="timeline-marker" aria-hidden="true">
              <MarkerIcon size={marker.moment ? 22 : 18} strokeWidth={2.4} />
            </span>
            <button
              className="agenda-body"
              onClick={() => onEdit(task)}
              aria-label={`Edit ${task.title}, ${task.start_time.slice(0, 5)} to ${endTime(task.start_time, task.duration_minutes)}${hasOverlap ? ", overlaps another task" : ""}`}
            >
              <span className="agenda-time">
                {task.start_time.slice(0, 5)}–{endTime(task.start_time, task.duration_minutes)}
              </span>
              <strong>{task.title}</strong>
            </button>
            {hasOverlap && (
              <span
                className="agenda-conflict"
                title="This task overlaps another task"
                aria-label="Overlaps another task"
              >
                <Link2 size={16} aria-hidden="true" />
              </span>
            )}
            <button
              className="completion-button"
              aria-label={`${task.is_completed ? "Reopen" : "Complete"} ${task.title}`}
              aria-pressed={task.is_completed}
              disabled={pending}
              onClick={() => onComplete(task)}
            >
              {task.is_completed && <Check size={14} />}
            </button>
          </DraggableTaskCard>
        </div>;
      })}
      {!draggingTask && (
        <button
          className="agenda-add"
          aria-label="Add scheduled task"
          title="Add task"
          onClick={() =>
            onAdd(finish > 0 && finish <= 1410 ? clockTime(finish) : "09:00")
          }
        >
          <Plus size={22} />
        </button>
      )}
    </div>
  );
}
