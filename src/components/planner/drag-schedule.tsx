"use client";

import { useDraggable, useDroppable, pointerWithin, closestCenter, type CollisionDetection } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { InboxTask } from "@/lib/tasks/types";

// Offscreen rows must not accept a drop outside their scrolling time list.
export const scheduleCollision: CollisionDetection = (args) => {
  const containers = args.droppableContainers.filter((container) => {
    const node = container.node.current;
    const list = node?.closest(".schedule-drop-times");
    if (!node) return false;
    if (!list) return true;
    const bounds = list.getBoundingClientRect();
    const row = node.getBoundingClientRect();
    const pointer = args.pointerCoordinates;
    return pointer
      ? pointer.x >= bounds.left && pointer.x <= bounds.right && pointer.y >= bounds.top && pointer.y <= bounds.bottom
      : row.bottom > bounds.top && row.top < bounds.bottom;
  });
  const visible = { ...args, droppableContainers: containers };
  return args.pointerCoordinates ? pointerWithin(visible) : closestCenter(visible);
};

export function TaskDragHandle({ task, disabled }: { task: InboxTask; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id, data: { task }, disabled,
  });
  return <button type="button" ref={setNodeRef} {...attributes} {...listeners}
    className="task-drag-handle" aria-label={`Drag ${task.title} to schedule`}
    disabled={disabled} data-dragging={isDragging}>
    <GripVertical size={18} />
  </button>;
}

/** The Inbox is a drop destination too: dropping a scheduled task here
 * removes its schedule while keeping the task. */
export function InboxDropZone({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "planner-inbox-dropzone",
    data: { kind: "inbox" },
  });
  return (
    <div
      ref={setNodeRef}
      className={`inbox-drop-zone${className ? ` ${className}` : ""}`}
      data-over={isOver || undefined}
    >
      {children}
    </div>
  );
}

type DraggableTaskCardProps = Omit<ComponentPropsWithoutRef<"article">, "children"> & {
  task: InboxTask;
  disabled: boolean;
  children: ReactNode;
};

/**
 * Makes the full scheduled-task surface the drag activator. Controls inside
 * the card remain normal buttons: a short click edits/completes, while a
 * deliberate pointer movement starts the shared DnD sensor.
 */
export function DraggableTaskCard({
  task,
  disabled,
  children,
  ...props
}: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled,
  });
  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      {...props}
      data-draggable={disabled ? undefined : "true"}
      data-dragging={isDragging || undefined}
    >
      {children}
    </article>
  );
}

function TimeTarget({ day, time, duration }: { day: string; time: string; duration: number }) {
  const [hours, minutes] = time.split(":").map(Number);
  const disabled = hours * 60 + minutes + duration > 1440;
  const { setNodeRef, isOver } = useDroppable({
    id: `schedule-${day}-${time}`, data: { day, time }, disabled,
  });
  return <div ref={setNodeRef} className="schedule-drop-time" data-over={isOver}
    aria-disabled={disabled}>{time}{isOver && <span> · Drop here</span>}</div>;
}

export function ScheduleTargets({ day, duration }: { day: string; duration: number }) {
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = scroll.current?.children[18] as HTMLElement | undefined;
    if (scroll.current && target) scroll.current.scrollTop = target.offsetTop - scroll.current.offsetTop;
  }, []);
  return <div ref={scroll} className="schedule-drop-times" aria-label={`Schedule on ${day}`}>
    {Array.from({ length: 48 }, (_, index) => {
      const time = `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
      return <TimeTarget key={time} day={day} time={time} duration={duration} />;
    })}
  </div>;
}
