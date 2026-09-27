"use client";
import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import {
  X,
  Check,
  CalendarDays,
  Inbox,
  Clock3,
  Trash2,
  AlignLeft,
  Minus,
  Plus,
} from "lucide-react";
import { saveTask, deleteTask } from "@/app/planner/actions";
import { taskColors, taskColor } from "@/lib/tasks/colors";
import type { InboxTask } from "@/lib/tasks/types";

const durationPresets = [15, 30, 45, 60, 90, 120, 150, 180];

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function TaskEditor({
  task,
  date,
  time,
  timezone,
  onClose,
  returnFocus,
  onSaved,
}: {
  task: InboxTask | null;
  date: string;
  time?: string;
  timezone: string;
  onClose: () => void;
  onSaved: (date: string | null) => void;
  returnFocus: React.RefObject<HTMLElement | null>;
}) {
  const [scheduled, setScheduled] = useState(
    Boolean(task?.scheduled_date || time),
  );
  const [color, setColor] = useState(taskColor(task?.color));
  const [duration, setDuration] = useState(task?.duration_minutes ?? 30);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  function close() {
    if (pending) return;
    if (dirty) {
      setDiscard(true);
      return;
    }
    onClose();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const chosenDate = scheduled ? String(form.get("date")) : null;
        const result = await saveTask(task?.id ?? null, {
          title: form.get("title"),
          notes: form.get("notes") ?? "",
          duration_minutes: duration,
          color,
          scheduled_date: chosenDate,
          start_time: scheduled ? form.get("time") : null,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSaved(chosenDate);
        onClose();
      } catch {
        setError(
          "Could not confirm your save. Your draft is still here. Check your connection before retrying.",
        );
      }
    });
  }
  function remove() {
    if (!task) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteTask(task.id);
        if (result.ok) onClose();
        else setError(result.message);
      } catch {
        setError(
          "Could not confirm deletion. Please refresh and check your task.",
        );
      }
    });
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content
          className="task-sheet"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("task-title")?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
            else document.getElementById("add-task")?.focus();
          }}
        >
          <div className="sheet-handle" />
          <div className="sheet-heading">
            <div>
              <Dialog.Title>
                {time ? "Place task" : task ? "Edit task" : "New task"}
              </Dialog.Title>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close task editor"
              disabled={pending}
              onClick={close}
            >
              <X size={20} />
            </button>
          </div>
          <Dialog.Description className="sr-only">
            Edit your task, schedule, duration, notes, and color. Times use{" "}
            {timezone}.
          </Dialog.Description>
          <form onSubmit={submit} onChange={() => setDirty(true)}>
            <fieldset disabled={pending} className="editor-fields">
              <label className="sr-only" htmlFor="task-title">
                Task title
              </label>
              <input
                id="task-title"
                className="task-title-input"
                name="title"
                placeholder="Task name"
                defaultValue={task?.title ?? ""}
                required
                maxLength={200}
              />
              <div
                className="color-picker"
                role="group"
                aria-label="Task color"
              >
                {taskColors.map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-color={value}
                    className="color-dot"
                    aria-label={value[0].toUpperCase() + value.slice(1)}
                    aria-pressed={color === value}
                    title={value}
                    onClick={() => {
                      setColor(value);
                      setDirty(true);
                    }}
                  >
                    {color === value && <Check size={17} strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <div
                className="editor-schedule-toggle"
                role="group"
                aria-label="Task placement"
              >
                <button
                  type="button"
                  aria-pressed={!scheduled}
                  onClick={() => {
                    setScheduled(false);
                    setDirty(true);
                  }}
                >
                  <Inbox size={17} />
                  Inbox
                </button>
                <button
                  type="button"
                  aria-pressed={scheduled}
                  onClick={() => {
                    setScheduled(true);
                    setDirty(true);
                  }}
                >
                  <CalendarDays size={17} />
                  Set a time
                </button>
              </div>
              {scheduled && (
                <div className="editor-row">
                  <label>
                    Date
                    <input
                      type="date"
                      name="date"
                      defaultValue={time ? date : task?.scheduled_date ?? date}
                      required
                    />
                  </label>
                  <label>
                    Start time
                    <input
                      type="time"
                      name="time"
                      defaultValue={
                        time ?? task?.start_time?.slice(0, 5) ?? "09:00"
                      }
                      step={300}
                      required
                    />
                  </label>
                </div>
              )}
              <div className="duration-editor" role="group" aria-label="Task duration">
                <span className="duration-heading">
                  <Clock3 size={16} /> Duration
                </span>
                <div className="duration-presets" aria-label="Quick durations">
                  {durationPresets.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      aria-pressed={duration === minutes}
                      onClick={() => {
                        setDuration(minutes);
                        setDirty(true);
                      }}
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
                      onClick={() => {
                        setDuration((current) => Math.max(5, current - 15));
                        setDirty(true);
                      }}
                    >
                      <Minus size={16} />
                    </button>
                    <output aria-live="polite">{durationLabel(duration)}</output>
                    <button
                      type="button"
                      aria-label="Increase duration by 15 minutes"
                      onClick={() => {
                        setDuration((current) => Math.min(1440, current + 15));
                        setDirty(true);
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <input type="hidden" name="duration" value={duration} />
              </div>
              <details
                className="notes-details"
                open={task?.notes ? true : undefined}
              >
                <summary>
                  <AlignLeft size={16} /> {task?.notes ? "Notes" : "Add a note"}
                </summary>
                <label className="sr-only" htmlFor="task-notes">
                  Notes
                </label>
                <textarea
                  id="task-notes"
                  name="notes"
                  defaultValue={task?.notes ?? ""}
                  rows={3}
                  maxLength={10000}
                  placeholder="Notes"
                />
              </details>
              {scheduled && (
                <p className="editor-timezone">All times in {timezone}</p>
              )}
            </fieldset>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {discard && (
              <div className="confirm-panel">
                <p>Discard your unsaved changes?</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setDiscard(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={onClose}
                >
                  Discard
                </button>
              </div>
            )}
            {confirmDelete && (
              <div className="confirm-panel">
                <p>Delete this task? This can’t be undone.</p>
                <button
                  type="button"
                  className="text-button"
                  disabled={pending}
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep task
                </button>
                <button
                  type="button"
                  className="text-button danger"
                  disabled={pending}
                  onClick={remove}
                >
                  Delete task
                </button>
              </div>
            )}
            <div className="editor-footer">
              {task ? (
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label="Delete task"
                  disabled={pending}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={18} />
                </button>
              ) : (
                <span />
              )}
              <button className="primary-button" disabled={pending}>
                {pending
                  ? "Saving…"
                  : time
                    ? "Place task"
                    : task
                      ? "Save changes"
                      : "Add task"}
                <Check size={17} />
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
