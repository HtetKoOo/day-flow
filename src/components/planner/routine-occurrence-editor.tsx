"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { X, Check } from "lucide-react";
import { saveRoutineOccurrence } from "@/app/planner/actions";
import { DatePicker, TimePicker } from "./date-time-picker";
import { DurationPicker } from "./duration-picker";
import type { Routine } from "@/lib/tasks/routines";
import type { InboxTask } from "@/lib/tasks/types";

export function RoutineOccurrenceEditor({
  routine,
  task,
  date,
  onClose,
  onSaved,
  onEditSeries,
}: {
  routine: Routine;
  task: InboxTask;
  date: string;
  onClose: () => void;
  onSaved: () => void;
  onEditSeries: () => void;
}) {
  const original = task.occurrence_date ?? date;
  const [duration, setDuration] = useState(task.duration_minutes);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function save(input: unknown) {
    setError("");
    startTransition(async () => {
      const result = await saveRoutineOccurrence(routine.id, input);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSaved();
      onClose();
    });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save({
      mode: "change",
      occurrence_date: original,
      scheduled_date: data.get("date"),
      start_time: data.get("time"),
      duration_minutes: duration,
    });
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="task-sheet routine-sheet">
          <div className="sheet-heading">
            <Dialog.Title>Edit this occurrence</Dialog.Title>
            <button
              type="button"
              className="icon-button"
              disabled={pending}
              onClick={onClose}
              aria-label="Close occurrence editor"
            >
              <X size={20} />
            </button>
          </div>
          <Dialog.Description className="mb-6 text-sm text-muted-foreground">
            {routine.title} · {original}. Changes apply only to this occurrence.
          </Dialog.Description>
          <form onSubmit={submit} className="space-y-6">
            <fieldset disabled={pending} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm">Date</span>
                  <DatePicker
                    name="date"
                    label="Occurrence date"
                    defaultValue={task.scheduled_date ?? date}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm">Start time</span>
                  <TimePicker
                    name="time"
                    label="Occurrence start time"
                    defaultValue={
                      task.start_time?.slice(0, 5) ??
                      routine.start_time.slice(0, 5)
                    }
                  />
                </label>
              </div>
              <DurationPicker duration={duration} onChange={setDuration} />
            </fieldset>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button className="primary-button" disabled={pending}>
                {pending ? "Saving…" : "Save this occurrence"}
                <Check size={17} />
              </button>
              <button
                type="button"
                className="text-button"
                disabled={pending}
                onClick={() =>
                  save({ mode: "skip", occurrence_date: original })
                }
              >
                Skip this occurrence
              </button>
              {task.is_exception && (
                <button
                  type="button"
                  className="text-button"
                  disabled={pending}
                  onClick={() =>
                    save({ mode: "reset", occurrence_date: original })
                  }
                >
                  Restore original schedule
                </button>
              )}
            </div>
          </form>
          <button
            type="button"
            className="mt-8 text-sm text-primary underline underline-offset-4"
            disabled={pending}
            onClick={onEditSeries}
          >
            Edit entire routine instead
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
