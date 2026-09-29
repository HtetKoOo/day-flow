import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Timeline } from "@/components/planner/timeline";
import { buildRangeTimeAxis } from "@/components/planner/planner-time-axis";
import type { InboxTask, ScheduledTask } from "@/lib/tasks/types";

export function PlannerTimelineContent({
  scheduleError,
  onRetry,
  isRangeView,
  isWeek,
  isTwoDays,
  days,
  scheduledByDay,
  renderDate,
  onEdit,
  onAdd,
  onComplete,
  pending,
  dragTask,
  dragTarget,
  timeAxis,
}: {
  scheduleError: boolean;
  onRetry: () => void;
  isRangeView: boolean;
  isWeek: boolean;
  isTwoDays: boolean;
  days: string[];
  scheduledByDay: Map<string, ScheduledTask[]>;
  renderDate: (day: string) => ReactNode;
  onEdit: (task: InboxTask) => void;
  onAdd: (day: string, time?: string) => void;
  onComplete: (task: InboxTask) => void;
  pending: boolean;
  dragTask: InboxTask | null;
  dragTarget: { day: string; time: string; top: number } | null;
  timeAxis: ReturnType<typeof buildRangeTimeAxis> | undefined;
}) {
  if (scheduleError) {
    return (
      <div role="alert" className="empty-schedule">
        <p>We couldn’t load your plans.</p>
        <button className="text-button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className={`timeline-scroll ${isRangeView ? "range-scroll" : ""}`}>
      <div
        className={`selected-timelines ${isWeek ? "week-timelines" : isTwoDays ? "two-day-timelines" : ""}`}
      >
        {days.map((day) => (
          <section
            key={day}
            className={`timeline-day ${isRangeView ? "range-day" : "day-timeline"}`}
            aria-label={format(parseISO(day), "EEEE, MMMM d")}
            style={{ viewTransitionName: `dayflow-column-${day}` }}
          >
            {isRangeView && (
              <div className="range-date-header">{renderDate(day)}</div>
            )}
            <Timeline
              day={day}
              tasks={scheduledByDay.get(day) ?? []}
              onEdit={onEdit}
              onAdd={(time) => onAdd(day, time)}
              onComplete={onComplete}
              pending={pending}
              compact={isWeek}
              draggingTask={dragTask}
              dragTime={dragTarget?.day === day ? dragTarget.time : null}
              dragPosition={dragTarget?.day === day ? dragTarget.top : null}
              timeAxis={timeAxis}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
