import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { MouseEvent } from "react";
import { taskColor } from "@/lib/tasks/colors";
import type { ScheduledTask } from "@/lib/tasks/types";

export function PlannerDateCell({
  day,
  today,
  displayedDay,
  isRangeView,
  tasks,
  incomplete,
  href,
  onNavigate,
}: {
  day: string;
  today: string;
  displayedDay: string;
  isRangeView: boolean;
  tasks: ScheduledTask[];
  incomplete: boolean;
  href: string;
  onNavigate: (day: string) => void;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      isRangeView ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (day !== displayedDay) onNavigate(day);
  }

  return (
    <Link
      href={href}
      className="date-cell"
      aria-current={day === displayedDay ? "date" : undefined}
      data-today={day === today}
      aria-label={`${format(parseISO(day), "EEEE, MMMM d")}${day === today ? ", today" : ""}, ${incomplete ? "task preview unavailable" : `${tasks.length} tasks`}`}
      onClick={handleClick}
    >
      <span>{format(parseISO(day), "EEE")}</span>
      <strong>{format(parseISO(day), "d")}</strong>
      <span className="date-dots" aria-hidden="true">
        {incomplete ? (
          <span>·</span>
        ) : (
          <>
            {tasks.slice(0, 3).map((task) => (
              <i key={task.id} data-color={taskColor(task.color)} />
            ))}
            {tasks.length > 3 && <small>+{tasks.length - 3}</small>}
          </>
        )}
      </span>
    </Link>
  );
}
