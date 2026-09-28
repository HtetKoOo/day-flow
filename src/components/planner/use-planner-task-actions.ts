"use client";

import { useCallback, useState, useTransition } from "react";
import { completeTask, scheduleTask } from "@/app/planner/actions";
import type { InboxTask, TaskResult } from "@/lib/tasks/types";

type UndoAction = { kind: "schedule" | "completion"; task: InboxTask };

type ScheduleUpdater = (task: InboxTask, day: string | null, time: string | null) => void;

/** Coordinates optimistic scheduling with server confirmation, errors, and undo. */
export function usePlannerTaskActions({
  applySchedule,
  publishSchedule,
}: {
  applySchedule: ScheduleUpdater;
  publishSchedule: ScheduleUpdater;
}) {
  const [notice, setNotice] = useState<TaskResult | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [pending, startTransition] = useTransition();

  const dismissNotice = useCallback(() => {
    setNotice(null);
    setUndoAction(null);
  }, []);

  const persistSchedule = useCallback((
    task: InboxTask,
    day: string | null,
    time: string | null,
    undo = false,
  ) => {
    setNotice(null);
    setUndoAction(null);
    applySchedule(task, day, time);
    startTransition(async () => {
      try {
        const result = await scheduleTask({
          id: task.id,
          scheduled_date: day,
          start_time: time,
          duration_minutes: task.duration_minutes,
        });
        setNotice(result);
        if (result.ok) {
          publishSchedule(task, day, time);
          setUndoAction(undo ? null : { kind: "schedule", task });
        } else {
          applySchedule(
            { ...task, scheduled_date: day, start_time: time },
            task.scheduled_date ?? null,
            task.start_time ?? null,
          );
        }
      } catch {
        applySchedule(
          { ...task, scheduled_date: day, start_time: time },
          task.scheduled_date ?? null,
          task.start_time ?? null,
        );
        setNotice({ ok: false, message: "Couldn’t confirm the schedule. Refresh to check before retrying." });
      }
    });
  }, [applySchedule, publishSchedule]);

  const complete = useCallback((task: InboxTask, undo = false) => {
    setNotice(null);
    setUndoAction(null);
    startTransition(async () => {
      try {
        const result = await completeTask({
          id: task.id,
          completed: undo ? task.is_completed : !task.is_completed,
        });
        setNotice(result);
        if (result.ok && !undo) setUndoAction({ kind: "completion", task });
      } catch {
        setNotice({ ok: false, message: "Couldn’t confirm that change. Refresh and try again." });
      }
    });
  }, []);

  const undo = useCallback(() => {
    if (!undoAction) return;
    if (undoAction.kind === "completion") {
      complete(undoAction.task, true);
      return;
    }
    persistSchedule(
      undoAction.task,
      undoAction.task.scheduled_date ?? null,
      undoAction.task.start_time?.slice(0, 5) ?? null,
      true,
    );
  }, [complete, persistSchedule, undoAction]);

  return {
    notice,
    pending,
    dismissNotice,
    persistSchedule,
    complete,
    undo: notice?.ok && undoAction ? undo : undefined,
    showNotice: setNotice,
  };
}
