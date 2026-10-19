"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import {
  Bell,
  CalendarClock,
  Check,
  Pause,
  Play,
  Trash2,
  X,
} from "lucide-react";
import {
  createRoutine,
  deleteRoutine,
  setRoutineActive,
  updateRoutine,
} from "@/app/planner/actions";
import { DatePicker, TimePicker } from "@/components/planner/date-time-picker";
import { DurationPicker } from "@/components/planner/duration-picker";
import { weekdayLabels, type Routine } from "@/lib/tasks/routines";
import { routineInput } from "@/lib/validation/routine";
import { RoutineChanges } from "./routine-changes";
import { taskColor, taskPickerColorOptions } from "@/lib/tasks/colors";
import { taskIcon, taskIconNames, type TaskIconName } from "@/lib/tasks/icons";

export function RoutineEditor({
  date,
  routine,
  rangeFrom = date,
  rangeTo = date,
  onClose,
  onSaved,
}: {
  date: string;
  routine?: Routine | null;
  rangeFrom?: string;
  rangeTo?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(routine?.title ?? "");
  const [notes, setNotes] = useState(routine?.notes ?? "");
  const [selectedTime, setSelectedTime] = useState(
    routine?.start_time.slice(0, 5) ?? "09:00",
  );
  const [startsOn, setStartsOn] = useState(routine?.starts_on ?? date);
  const [endsOn, setEndsOn] = useState(
    routine?.ends_on ?? routine?.starts_on ?? date,
  );
  const [days, setDays] = useState<number[]>(
    routine?.days_of_week ?? [1, 2, 3, 4, 5],
  );
  const [duration, setDuration] = useState(routine?.duration_minutes ?? 60);
  const [color, setColor] = useState(taskColor(routine?.color));
  const [icon, setIcon] = useState<TaskIconName>(routine?.icon ?? "focus");
  const [isPrivate, setIsPrivate] = useState(routine?.is_private ?? false);
  const [reminder, setReminder] = useState<number | null>(
    routine?.reminder_minutes ?? null,
  );
  const [hasEndDate, setHasEndDate] = useState(Boolean(routine?.ends_on));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const values = {
    title: title.trim(),
    notes,
    color,
    icon,
    is_private: isPrivate,
    reminder_minutes: reminder,
    start_time: selectedTime,
    starts_on: startsOn,
    ends_on: hasEndDate ? endsOn : null,
    days_of_week: [...days].sort((a, b) => a - b),
    duration_minutes: duration,
  };
  const [initialValues] = useState(() => JSON.stringify(values));
  const hasChanges = JSON.stringify(values) !== initialValues;
  const validation = routineInput.safeParse(values);
  const canSave = validation.success && (!routine || hasChanges);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSave) return;
    setError("");
    startTransition(async () => {
      const result = routine
        ? await updateRoutine(routine.id, values)
        : await createRoutine(values);
      if (!result.ok) return setError(result.message);
      onSaved();
      onClose();
    });
  }
  function toggleActive() {
    if (!routine) return;
    setError("");
    startTransition(async () => {
      const result = await setRoutineActive(routine.id, !routine.is_active);
      if (!result.ok) return setError(result.message);
      onSaved();
      onClose();
    });
  }
  function remove() {
    if (!routine) return;
    setError("");
    startTransition(async () => {
      const result = await deleteRoutine(routine.id);
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
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={200}
                autoFocus
              />
              <div
                className="color-picker"
                role="group"
                aria-label="Routine color"
              >
                {taskPickerColorOptions(color).map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-color={value}
                    className="color-dot"
                    aria-label={value[0].toUpperCase() + value.slice(1)}
                    aria-pressed={color === value}
                    title={value}
                    onClick={() => setColor(value)}
                  >
                    {color === value && <Check size={17} strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <div
                className="icon-picker"
                role="group"
                aria-label="Routine icon"
              >
                {taskIconNames.map((value) => {
                  const Icon = taskIcon(value)!;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={value}
                      aria-pressed={icon === value}
                      title={value}
                      onClick={() => setIcon(value)}
                    >
                      <Icon size={19} />
                    </button>
                  );
                })}
              </div>
              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                />
                <span>
                  <strong>Private</strong>
                  <small>Hide title and notes in calendar exports</small>
                </span>
              </label>
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
                    defaultValue={selectedTime}
                    onValueChange={setSelectedTime}
                    label="Choose routine start time"
                  />
                </label>
                <label>
                  Start from
                  <DatePicker
                    name="starts_on"
                    defaultValue={startsOn}
                    onValueChange={setStartsOn}
                    label="Choose routine start date"
                  />
                </label>
              </div>
              <label className="reminder-picker">
                <Bell size={17} aria-hidden="true" />
                <span>Reminder</span>
                <select
                  value={reminder ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                      ? Number(event.target.value)
                      : null;
                    setReminder(value);
                    if (
                      value &&
                      "Notification" in window &&
                      Notification.permission === "default"
                    )
                      void Notification.requestPermission();
                  }}
                >
                  <option value="">No reminder</option>
                  <option value="5">5 minutes before</option>
                  <option value="10">10 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                </select>
              </label>
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
                    min={startsOn}
                    defaultValue={endsOn}
                    onValueChange={setEndsOn}
                    label="Choose routine end date"
                  />
                )}
              </div>
              <DurationPicker
                duration={duration}
                onChange={setDuration}
                Icon={CalendarClock}
              />
              <textarea
                className="routine-notes"
                name="notes"
                rows={2}
                placeholder="Add a note…"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={10000}
              />
            </fieldset>
            {title.trim() && !validation.success && (
              <p className="form-error" role="status">
                {validation.error.issues[0].message}
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="editor-footer">
              {routine ? (
                <div className="editor-secondary-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={
                      routine.is_active ? "Pause routine" : "Resume routine"
                    }
                    title={
                      routine.is_active ? "Pause routine" : "Resume routine"
                    }
                    disabled={pending}
                    onClick={toggleActive}
                  >
                    {routine.is_active ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label="Delete routine"
                    title="Delete routine"
                    disabled={pending}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <span />
              )}
              <button
                className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending || !canSave}
              >
                {pending ? "Saving…" : routine ? "Save changes" : "Add routine"}
                <Check size={17} />
              </button>
            </div>
          </form>
          {routine && (
            <RoutineChanges
              routine={routine}
              from={rangeFrom}
              to={rangeTo}
              onSaved={onSaved}
            />
          )}
          <Dialog.Root
            open={confirmDelete}
            onOpenChange={(open) =>
              !open && !pending && setConfirmDelete(false)
            }
          >
            <Dialog.Portal>
              <Dialog.Overlay className="confirmation-overlay" />
              <Dialog.Content className="confirmation-dialog">
                <Dialog.Title>Delete this routine?</Dialog.Title>
                <Dialog.Description>
                  Its future timetable blocks will be removed. This can’t be
                  undone.
                </Dialog.Description>
                <div className="confirmation-actions">
                  <button
                    type="button"
                    className="text-button"
                    disabled={pending}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep routine
                  </button>
                  <button
                    type="button"
                    className="confirmation-danger"
                    disabled={pending}
                    onClick={remove}
                  >
                    Delete routine
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
