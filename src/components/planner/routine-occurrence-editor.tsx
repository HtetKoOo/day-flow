"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { X, Check, ArrowRight } from "lucide-react";
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
  const initialDate = task.scheduled_date ?? date;
  const initialTime =
    task.start_time?.slice(0, 5) ?? routine.start_time.slice(0, 5);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [duration, setDuration] = useState(task.duration_minutes);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const hasChanges =
    selectedDate !== initialDate ||
    selectedTime !== initialTime ||
    duration !== task.duration_minutes;
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
    if (!hasChanges || pending) return;
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
            <Dialog.Title>Edit this day</Dialog.Title>
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
            {routine.title} · Changes apply only to {original}.
          </Dialog.Description>
          <form onSubmit={submit} className="space-y-6">
            <fieldset disabled={pending} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm">Date</span>
                  <DatePicker
                    name="date"
                    label="Occurrence date"
                    defaultValue={initialDate}
                    onValueChange={setSelectedDate}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm">Start time</span>
                  <TimePicker
                    name="time"
                    label="Occurrence start time"
                    defaultValue={initialTime}
                    onValueChange={setSelectedTime}
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
            <div className="space-y-4 border-t border-border pt-4">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={onEditSeries}
              >
                Edit entire routine <ArrowRight size={16} />
              </button>
              {task.is_exception && (
                <button
                  type="button"
                  className="text-button block min-h-11"
                  disabled={pending}
                  onClick={() =>
                    save({ mode: "reset", occurrence_date: original })
                  }
                >
                  Restore original schedule
                </button>
              )}
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="primary-button order-first w-full disabled:cursor-not-allowed disabled:opacity-50 sm:order-last sm:w-auto"
                  disabled={pending || !hasChanges}
                >
                  {pending ? "Saving…" : "Save changes"}
                  <Check size={17} />
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 py-3 text-sm hover:bg-muted disabled:opacity-50"
                  disabled={pending}
                  onClick={() =>
                    save({ mode: "skip", occurrence_date: original })
                  }
                >
                  Skip this day
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
