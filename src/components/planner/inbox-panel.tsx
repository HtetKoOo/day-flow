"use client";
import { useState, useTransition } from "react";
import { saveInboxTask } from "@/app/planner/actions";
import { Plus, Check, LoaderCircle } from "lucide-react";
import { taskColor } from "@/lib/tasks/colors";
import { TaskDragHandle } from "./drag-schedule";
import type { InboxTask } from "@/lib/tasks/types";
type Props = {
  tasks: InboxTask[];
  loadError: boolean;
  total: number;
  onEdit: (task: InboxTask) => void;
  onComplete: (task: InboxTask) => void;
  pending: boolean;
  onRetry: () => void;
};
export function InboxPanel({
  tasks,
  loadError,
  total,
  onEdit,
  onComplete,
  pending,
  onRetry,
}: Props) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [adding, startAdding] = useTransition();
  function card(task: InboxTask) {
    return (
      <li
        key={task.id}
        className={`inbox-card ${task.is_completed ? "is-complete" : ""}`}
        data-color={taskColor(task.color)}
      >
        <button
          type="button"
          className="completion-button"
          aria-label={`${task.is_completed ? "Reopen" : "Complete"} ${task.title}`}
          aria-pressed={task.is_completed}
          disabled={pending}
          onClick={() => onComplete(task)}
        >
          {task.is_completed ? <Check size={13} /> : null}
        </button>
        <button
          type="button"
          className="inbox-card-body"
          onClick={() => onEdit(task)}
        >
          <strong>{task.title}</strong>
          <span>{task.duration_minutes} min</span>
        </button>
        <TaskDragHandle task={task} disabled={pending || adding} />
      </li>
    );
  }
  return (
    <>
      <form className="inbox-quick-add" onSubmit={(event) => {
        event.preventDefault();
        if (adding || !title.trim()) return;
        setError("");
        startAdding(async () => {
          try {
            const result = await saveInboxTask(null, {
              title: title.trim(), notes: "", duration_minutes: 30,
            });
            if (result.ok) setTitle("");
            else setError(result.message);
          } catch {
            setError("Couldn’t save your task. Please try again.");
          }
        });
      }}>
        <input id="add-task" aria-label="New Inbox task" placeholder="Add a task…"
          value={title} onChange={(event) => setTitle(event.target.value)}
          maxLength={200} readOnly={adding} aria-describedby={error ? "inbox-add-error" : undefined} />
        <button type="submit" aria-label="Add to Inbox" aria-busy={adding} disabled={adding || !title.trim()}>
          {adding ? <LoaderCircle className="planner-spinner" size={22} /> : <Plus size={22} />}
        </button>
      </form>
      {error && <p id="inbox-add-error" role="alert" className="form-error">{error}</p>}
      {loadError ? (
        <div role="alert" className="empty-inbox">
          <p>Couldn’t load your Inbox.</p>
          <button className="text-button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <ul className="inbox-list">{tasks.map(card)}</ul>
          {total > tasks.length && (
            <p className="small-muted">
              Showing {tasks.length} of {total} tasks.
            </p>
          )}
        </>
      )}
    </>
  );
}
