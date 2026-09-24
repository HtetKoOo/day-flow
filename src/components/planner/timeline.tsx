"use client";
import { Plus, Check } from "lucide-react";
import { endTime, minutes } from "@/lib/tasks/schedule";
import { agendaTasks, clockTime } from "@/lib/tasks/agenda";
import { taskColor } from "@/lib/tasks/colors";
import { TaskDragHandle } from "./drag-schedule";
import type { ScheduledTask } from "@/lib/tasks/types";
export function Timeline({
  tasks,
  onEdit,
  onAdd,
  onComplete,
  pending,
  compact = false,
}: {
  tasks: ScheduledTask[];
  onEdit: (task: ScheduledTask) => void;
  onAdd: (time: string) => void;
  onComplete: (task: ScheduledTask) => void;
  pending: boolean;
  compact?: boolean;
}) {
  const items = agendaTasks(tasks);
  const finish = Math.max(
    0,
    ...tasks.map((t) => minutes(t.start_time) + t.duration_minutes),
  );
  return (
    <div className={`agenda ${compact ? "agenda-compact" : ""}`}>
      {items.map(({ task, gap, gapStart, overlaps }, index) => (
        <div key={task.id}>
          {gap > 0 && index > 0 && (
            <button
              className="agenda-gap"
              onClick={() => onAdd(clockTime(gapStart))}
              aria-label={`Add task between ${clockTime(gapStart)} and ${task.start_time.slice(0, 5)}`}
            >
              <Plus size={14} />
              <span>
                Free · {gap >= 60 ? `${Math.floor(gap / 60)}h` : ""}
                {gap % 60 ? ` ${gap % 60}m` : ""}
              </span>
            </button>
          )}
          <article
            className={`agenda-card ${task.is_completed ? "is-complete" : ""}`}
            data-color={taskColor(task.color)}
            style={{ viewTransitionName: `dayflow-task-${task.id}` }}
          >
            <button
              className="agenda-body"
              onClick={() => onEdit(task)}
              aria-label={`Edit ${task.title}, ${task.start_time.slice(0, 5)} to ${endTime(task.start_time, task.duration_minutes)}`}
            >
              <span className="agenda-time">
                {task.start_time.slice(0, 5)}–
                {endTime(task.start_time, task.duration_minutes)}
                {overlaps && <span className="overlap-label"> · Overlaps</span>}
              </span>
              <strong>{task.title}</strong>
            </button>
            <button
              className="completion-button"
              aria-label={`${task.is_completed ? "Reopen" : "Complete"} ${task.title}`}
              aria-pressed={task.is_completed}
              disabled={pending}
              onClick={() => onComplete(task)}
            >
              {task.is_completed && <Check size={14} />}
            </button>
            <TaskDragHandle task={task} disabled={pending} />
          </article>
        </div>
      ))}
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
    </div>
  );
}
