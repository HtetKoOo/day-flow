"use client";

import { useEffect, useRef, useState } from "react";
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { clockTime } from "@/lib/tasks/agenda";
import { minutes } from "@/lib/tasks/schedule";
import type { InboxTask } from "@/lib/tasks/types";

/** Keeps the drag marker centred below the grab point. */
export const centerOverlayOnCursor: Modifier = ({
  activatorEvent,
  activeNodeRect,
  overlayNodeRect,
  transform,
}) => {
  const pointer = activatorEvent as MouseEvent | null;
  if (
    !pointer ||
    typeof pointer.clientX !== "number" ||
    !activeNodeRect ||
    !overlayNodeRect
  ) {
    return transform;
  }
  return {
    ...transform,
    x:
      transform.x +
      pointer.clientX -
      activeNodeRect.left -
      overlayNodeRect.width / 2,
    y:
      transform.y +
      pointer.clientY -
      activeNodeRect.top -
      overlayNodeRect.height / 2,
  };
};

type DragTarget = { day: string; time: string; top: number };
type VisualDropTarget = { minute: number; top: number };

/**
 * The agenda compresses long free intervals. Resolve the pointer within its
 * visible card or gap, then project the snapped wall-clock time back there.
 */
function visualDropTarget(
  day: string,
  pointerY: number,
): VisualDropTarget | null {
  const agenda = [
    ...document.querySelectorAll<HTMLElement>("[data-timeline-day]"),
  ].find((element) => element.dataset.timelineDay === day);
  if (!agenda) return null;

  const segments = [
    ...agenda.querySelectorAll<HTMLElement>("[data-timeline-segment]"),
  ]
    .map((element) => {
      const start = element.dataset.start;
      const end = element.dataset.end;
      if (!start || !end) return null;
      return {
        start: minutes(start),
        end: minutes(end),
        rect: element.getBoundingClientRect(),
        kind: element.dataset.timelineSegmentKind ?? "gap",
      };
    })
    .filter(
      (
        segment,
      ): segment is {
        start: number;
        end: number;
        rect: DOMRect;
        kind: string;
      } => Boolean(segment),
    )
    .sort((left, right) => left.rect.top - right.rect.top);
  if (!segments.length) return null;

  const agendaRect = agenda.getBoundingClientRect();
  const first = segments[0];
  const last = segments[segments.length - 1];
  let start = first.start;
  let end = last.end;
  let top = agendaRect.top;
  let bottom = agendaRect.bottom;
  const containsPointer = (segment: (typeof segments)[number]) =>
    pointerY >= segment.rect.top && pointerY <= segment.rect.bottom;
  const activeSegment =
    segments.find(
      (segment) => segment.kind === "task" && containsPointer(segment),
    ) ?? segments.find(containsPointer);
  if (activeSegment) {
    start = activeSegment.start;
    end = activeSegment.end;
    top = activeSegment.rect.top;
    bottom = activeSegment.rect.bottom;
  } else if (pointerY < first.rect.top) {
    start = 6 * 60;
    end = first.start;
    top = agendaRect.top;
    bottom = first.rect.top;
  } else if (pointerY > last.rect.bottom) {
    start = last.end;
    end = 22 * 60;
    top = last.rect.bottom;
    bottom = agendaRect.bottom;
  } else {
    const next = segments.find((segment) => segment.rect.top > pointerY);
    const previous = next ? segments[segments.indexOf(next) - 1] : last;
    if (next && previous) {
      start = previous.end;
      end = next.start;
      top = previous.rect.bottom;
      bottom = next.rect.top;
    }
  }
  if (end <= start || bottom <= top) return null;
  const ratio = Math.max(0, Math.min(1, (pointerY - top) / (bottom - top)));
  const minute = Math.round((start + ratio * (end - start)) / 15) * 15;
  const snappedRatio = Math.max(
    0,
    Math.min(1, (minute - start) / (end - start)),
  );
  return { minute, top: top + snappedRatio * (bottom - top) - agendaRect.top };
}

export function usePlannerDrag({
  pending,
  onSchedule,
  onStart,
}: {
  pending: boolean;
  onSchedule: (
    task: InboxTask,
    day: string | null,
    time: string | null,
  ) => void;
  onStart: () => void;
}) {
  const [dragTask, setDragTask] = useState<InboxTask | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);
  const dragPointer = useRef<{ y: number } | null>(null);
  const queuedDragMove = useRef<DragMoveEvent | null>(null);
  const dragMoveFrame = useRef<number | null>(null);
  const pointerInitiatedDrag = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 240, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (!dragTask) return;
    const trackPointer = (event: PointerEvent) => {
      dragPointer.current = { y: event.clientY };
    };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    return () => window.removeEventListener("pointermove", trackPointer);
  }, [dragTask]);

  function updateDragTarget(event: DragMoveEvent) {
    const day = event.over?.data.current?.day;
    const surface = event.over?.rect;
    const task = event.active.data.current?.task as InboxTask | undefined;
    const activeRect = event.active.rect.current.translated;
    if (typeof day !== "string" || !surface || !task || !activeRect) {
      dragTargetRef.current = null;
      setDragTarget(null);
      return;
    }
    const pointerY =
      dragPointer.current?.y ?? activeRect.top + activeRect.height / 2;
    const visualTarget = visualDropTarget(day, pointerY);
    const ratio = Math.max(
      0,
      Math.min(1, (pointerY - surface.top) / surface.height),
    );
    const earliest = 6 * 60;
    const latest = 22 * 60 - task.duration_minutes;
    const minute = Math.max(
      earliest,
      Math.min(
        latest,
        visualTarget?.minute ??
          Math.round((earliest + ratio * (22 * 60 - earliest)) / 15) * 15,
      ),
    );
    const target = {
      day,
      time: clockTime(minute),
      top: visualTarget?.top ?? ratio * surface.height,
    };
    dragTargetRef.current = target;
    setDragTarget((current) =>
      current?.day === target.day &&
      current.time === target.time &&
      Math.abs(current.top - target.top) < 0.5
        ? current
        : target,
    );
  }

  function flushDragMove() {
    if (dragMoveFrame.current !== null) {
      cancelAnimationFrame(dragMoveFrame.current);
      dragMoveFrame.current = null;
    }
    const event = queuedDragMove.current;
    queuedDragMove.current = null;
    if (event) updateDragTarget(event);
  }

  function onDragMove(event: DragMoveEvent) {
    queuedDragMove.current = event;
    if (dragMoveFrame.current !== null) return;
    dragMoveFrame.current = requestAnimationFrame(() => {
      dragMoveFrame.current = null;
      const latest = queuedDragMove.current;
      queuedDragMove.current = null;
      if (latest) updateDragTarget(latest);
    });
  }

  function onDragStart(event: DragStartEvent) {
    pointerInitiatedDrag.current = "clientX" in event.activatorEvent;
    const pointer = event.activatorEvent as PointerEvent;
    dragPointer.current =
      typeof pointer.clientY === "number" ? { y: pointer.clientY } : null;
    dragTargetRef.current = null;
    queuedDragMove.current = null;
    setDragTask(event.active.data.current?.task as InboxTask);
    onStart();
  }

  function clearDrag() {
    if (dragMoveFrame.current !== null)
      cancelAnimationFrame(dragMoveFrame.current);
    dragMoveFrame.current = null;
    queuedDragMove.current = null;
    dragTargetRef.current = null;
    dragPointer.current = null;
    setDragTask(null);
    setDragTarget(null);
  }

  function onDragCancel() {
    clearDrag();
  }

  function onDragEnd(event: DragEndEvent) {
    const shouldClearPointerFocus = pointerInitiatedDrag.current;
    pointerInitiatedDrag.current = false;
    setDragTask(null);
    dragPointer.current = null;
    if (shouldClearPointerFocus) {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.closest("[data-draggable]"))
          active.blur();
      });
    }
    flushDragMove();
    const target = dragTargetRef.current;
    dragTargetRef.current = null;
    const task = event.active.data.current?.task as InboxTask | undefined;
    setDragTarget(null);
    if (!task || pending) return;
    if (event.over?.data.current?.kind === "inbox") {
      onSchedule(task, null, null);
      return;
    }
    if (target) onSchedule(task, target.day, target.time);
  }

  return {
    sensors,
    dragTask,
    dragTarget,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  };
}
