"use client";
import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { X, Check, CalendarDays, Inbox, Trash2, Bell } from "lucide-react";
import { saveTask, deleteTask } from "@/app/planner/actions";
import { DatePicker, TimePicker } from "@/components/planner/date-time-picker";
import { DurationPicker } from "@/components/planner/duration-picker";
import { taskColor, taskPickerColorOptions } from "@/lib/tasks/colors";
import { taskIcon, taskIconNames, type TaskIconName } from "@/lib/tasks/icons";
import { editorInput } from "@/lib/validation/editor";
import type { InboxTask } from "@/lib/tasks/types";

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
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [selectedDate, setSelectedDate] = useState(
    time ? date : (task?.scheduled_date ?? date),
  );
  const [selectedTime, setSelectedTime] = useState(
    time ?? task?.start_time?.slice(0, 5) ?? "09:00",
  );
  const [scheduled, setScheduled] = useState(
    Boolean(task?.scheduled_date || time),
  );
  const [color, setColor] = useState(taskColor(task?.color));
  const [icon, setIcon] = useState<TaskIconName>(task?.icon ?? "focus");
  const [isPrivate, setIsPrivate] = useState(task?.is_private ?? false);
  const [reminder, setReminder] = useState<number | null>(
    task?.reminder_minutes ?? null,
  );
  const [duration, setDuration] = useState(task?.duration_minutes ?? 30);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const values = {
    title: title.trim(),
    notes,
    duration_minutes: duration,
    color,
    icon,
    is_private: isPrivate,
    reminder_minutes: scheduled ? reminder : null,
    scheduled_date: scheduled ? selectedDate : null,
    start_time: scheduled ? selectedTime : null,
  };
  const [initialValues] = useState(() => JSON.stringify(values));
  const dirty = JSON.stringify(values) !== initialValues;
  const validation = editorInput.safeParse(values);
  const placementChanged = Boolean(
    task &&
    time &&
    (values.scheduled_date !== task.scheduled_date ||
      values.start_time !== task.start_time?.slice(0, 5)),
  );
  const canSave = validation.success && (!task || dirty || placementChanged);
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
    if (pending || !canSave) return;
    setError("");
    startTransition(async () => {
      try {
        const chosenDate = values.scheduled_date;
        const result = await saveTask(task?.id ?? null, values);
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
  const confirmation = discard
    ? {
        title: "Discard changes?",
        description: "Your unsaved changes will be lost.",
        cancel: "Keep editing",
        confirm: "Discard",
        onConfirm: onClose,
      }
    : confirmDelete
      ? {
          title: "Delete this task?",
          description: "This can’t be undone.",
          cancel: "Keep task",
          confirm: "Delete task",
          onConfirm: remove,
        }
      : null;

  return (
    <>
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
            <form onSubmit={submit}>
              <fieldset disabled={pending} className="editor-fields">
                <label className="sr-only" htmlFor="task-title">
                  Task title
                </label>
                <input
                  id="task-title"
                  className="task-title-input"
                  name="title"
                  placeholder="Task name"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={200}
                />
                <div
                  className="color-picker"
                  role="group"
                  aria-label="Task color"
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
                      onClick={() => {
                        setColor(value);
                      }}
                    >
                      {color === value && <Check size={17} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
                <div
                  className="icon-picker"
                  role="group"
                  aria-label="Task icon"
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
                        onClick={() => {
                          setIcon(value);
                        }}
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
                    onChange={(event) => {
                      setIsPrivate(event.target.checked);
                    }}
                  />
                  <span>
                    <strong>Private</strong>
                    <small>Hide title and notes in calendar exports</small>
                  </span>
                </label>
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
                      <DatePicker
                        name="date"
                        defaultValue={selectedDate}
                        onValueChange={setSelectedDate}
                        label="Choose task date"
                      />
                    </label>
                    <label>
                      Start time
                      <TimePicker
                        name="time"
                        defaultValue={selectedTime}
                        onValueChange={setSelectedTime}
                        label="Choose task start time"
                      />
                    </label>
                  </div>
                )}
                {scheduled && (
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
                )}
                <DurationPicker
                  duration={duration}
                  onChange={(value) => {
                    setDuration(value);
                  }}
                />
                <label className="notes-input" htmlFor="task-notes">
                  <textarea
                    id="task-notes"
                    name="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={2}
                    maxLength={10000}
                    placeholder="Add a note…"
                  />
                </label>
                {scheduled && (
                  <p className="editor-timezone">All times in {timezone}</p>
                )}
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
                <button
                  className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pending || !canSave}
                >
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
            <Dialog.Root
              open={Boolean(confirmation)}
              onOpenChange={(open) => {
                if (open || pending) return;
                setDiscard(false);
                setConfirmDelete(false);
              }}
            >
              <Dialog.Portal>
                <Dialog.Overlay className="confirmation-overlay" />
                <Dialog.Content className="confirmation-dialog">
                  <Dialog.Title>{confirmation?.title}</Dialog.Title>
                  <Dialog.Description>
                    {confirmation?.description}
                  </Dialog.Description>
                  <div className="confirmation-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={pending}
                      onClick={() => {
                        setDiscard(false);
                        setConfirmDelete(false);
                      }}
                    >
                      {confirmation?.cancel}
                    </button>
                    <button
                      type="button"
                      className="confirmation-danger"
                      disabled={pending}
                      onClick={() => confirmation?.onConfirm()}
                    >
                      {confirmation?.confirm}
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
