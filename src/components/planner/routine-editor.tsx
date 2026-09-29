"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { CalendarClock, Check, X } from "lucide-react";
import { createRoutine, updateRoutine } from "@/app/planner/actions";
import { DatePicker, TimePicker } from "@/components/planner/date-time-picker";
import { weekdayLabels, type Routine } from "@/lib/tasks/routines";

const presets = [30, 60, 90, 120];
const durationLabel = (minutes: number) =>
  minutes < 60
    ? `${minutes}m`
    : minutes % 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
      : `${minutes / 60}h`;

export function RoutineEditor({
  date,
  routine,
  onClose,
  onSaved,
}: {
  date: string;
  routine?: Routine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<number[]>(
    routine?.days_of_week ?? [1, 2, 3, 4, 5],
  );
  const [duration, setDuration] = useState(routine?.duration_minutes ?? 60);
  const [hasEndDate, setHasEndDate] = useState(Boolean(routine?.ends_on));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const values = {
        title: form.get("title"),
        notes: form.get("notes") ?? "",
        start_time: form.get("time"),
        starts_on: form.get("starts_on"),
        ends_on: hasEndDate ? form.get("ends_on") : null,
        days_of_week: days,
        duration_minutes: duration,
      };
      const result = routine
        ? await updateRoutine(routine.id, values)
        : await createRoutine(values);
      if (!result.ok) return setError(result.message);
      onSaved();
      onClose();
    });
  }
  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="task-sheet routine-sheet">
          <div className="sheet-handle" />
          <div className="sheet-heading">
            <Dialog.Title>
              {routine ? "Edit routine" : "New routine"}
            </Dialog.Title>
            <button
              type="button"
              className="icon-button"
              aria-label="Close routine editor"
              onClick={onClose}
              disabled={pending}
            >
              <X size={20} />
            </button>
          </div>
          <Dialog.Description className="routine-description">
            {routine
              ? "Changes update future appearances on your timetable."
              : "Create a weekly block such as sleep, work, or gym."}
          </Dialog.Description>
          <form onSubmit={submit}>
            <fieldset className="editor-fields" disabled={pending}>
              <input
                id="routine-title"
                className="task-title-input"
                name="title"
                placeholder="Routine name"
                defaultValue={routine?.title ?? ""}
                required
                maxLength={200}
                autoFocus
              />
              <div className="routine-days" role="group" aria-label="Repeat on">
                <span>Repeat every</span>
                <div>
                  {weekdayLabels.map((label, day) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={days.includes(day)}
                      onClick={() =>
                        setDays((current) =>
                          current.includes(day)
                            ? current.filter((item) => item !== day)
                            : [...current, day],
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="editor-row">
                <label>
                  Start time
                  <TimePicker
                    name="time"
                    defaultValue={routine?.start_time.slice(0, 5) ?? "09:00"}
                    label="Choose routine start time"
                  />
                </label>
                <label>
                  Start from
                  <DatePicker
                    name="starts_on"
                    defaultValue={routine?.starts_on ?? date}
                    label="Choose routine start date"
                  />
                </label>
              </div>
              <div className="routine-end-date">
                <label>
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(event) => setHasEndDate(event.target.checked)}
                  />{" "}
                  Ends on a date
                </label>
                {hasEndDate && (
                  <DatePicker
                    name="ends_on"
                    min={routine?.starts_on ?? date}
                    defaultValue={
                      routine?.ends_on ?? routine?.starts_on ?? date
                    }
                    label="Choose routine end date"
                  />
                )}
              </div>
              <div className="duration-editor">
                <span className="duration-heading">
                  <CalendarClock size={16} /> Duration
                </span>
                <div className="duration-presets">
                  {presets.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      aria-pressed={duration === minutes}
                      onClick={() => setDuration(minutes)}
                    >
                      {durationLabel(minutes)}
                    </button>
                  ))}
                </div>
                <div className="duration-stepper">
                  <span>Custom</span>
                  <div>
                    <button
                      type="button"
                      aria-label="Reduce duration by 15 minutes"
                      onClick={() =>
                        setDuration((value) => Math.max(5, value - 15))
                      }
                    >
                      −
                    </button>
                    <output>{durationLabel(duration)}</output>
                    <button
                      type="button"
                      aria-label="Increase duration by 15 minutes"
                      onClick={() =>
                        setDuration((value) => Math.min(1440, value + 15))
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <textarea
                className="routine-notes"
                name="notes"
                rows={2}
                placeholder="Add a note…"
                defaultValue={routine?.notes ?? ""}
                maxLength={10000}
              />
            </fieldset>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="editor-footer">
              <span />
              <button className="primary-button" disabled={pending}>
                {pending ? "Saving…" : routine ? "Save changes" : "Add routine"}
                <Check size={17} />
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
