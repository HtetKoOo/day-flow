"use client";

import { Check, X } from "lucide-react";
import { DurationPicker } from "@/components/planner/duration-picker";
import { demoTaskColors, demoTaskIconNames } from "@/lib/demo/palette";
import { taskIcon, type TaskIconName } from "@/lib/tasks/icons";
import type { InboxTask } from "@/lib/tasks/types";
import { useState } from "react";

export function DemoTaskEditor({
  task,
  date,
  startTime,
  scheduled = true,
  onClose,
  onSave,
}: {
  task: InboxTask | null;
  date?: string;
  startTime?: string;
  scheduled?: boolean;
  onClose: () => void;
  onSave: (task: InboxTask) => void;
}) {
  const defaults = task ?? {
    id: `demo-custom-${crypto.randomUUID()}`,
    title: "",
    notes: "",
    duration_minutes: 30,
    color: "sage",
    icon: "focus" as TaskIconName,
    is_completed: false,
    scheduled_date: scheduled ? (date ?? null) : null,
    start_time: scheduled ? (startTime ?? "09:00") : null,
  };

  const [duration, setDuration] = useState(defaults.duration_minutes);

  return (
    <div className="demo-editor-backdrop" role="presentation">
      <form
        className="demo-editor"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            ...defaults,
            title: String(form.get("title")).trim(),
            color: String(form.get("color")),
            icon: String(form.get("icon")) as TaskIconName,
            scheduled_date: scheduled ? String(form.get("date")) : null,
            start_time: scheduled ? String(form.get("time")) : null,
            duration_minutes: duration,
          });
        }}
      >
        <div className="sheet-heading">
          <h2>{task ? "Edit task" : "New task"}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X size={20} />
          </button>
        </div>
        <input
          className="task-title-input"
          name="title"
          defaultValue={defaults.title}
          placeholder="Task name"
          required
          autoFocus
          maxLength={200}
        />

        <label className="demo-editor-label">Color</label>
        <div className="color-picker" aria-label="Task color">
          {demoTaskColors.map((color) => (
            <label key={color} data-color={color} className="color-dot">
              <input
                type="radio"
                name="color"
                value={color}
                aria-label={`${color} color`}
                defaultChecked={defaults.color === color}
              />
              <Check size={15} aria-hidden="true" />
            </label>
          ))}
        </div>

        <label className="demo-editor-label">Icon</label>
        <div className="demo-icon-picker" aria-label="Task icon">
          {demoTaskIconNames.map((name) => {
            const Icon = taskIcon(name)!;
            return (
              <label key={name} title={name}>
                <input
                  type="radio"
                  name="icon"
                  value={name}
                  aria-label={name}
                  defaultChecked={defaults.icon === name}
                />
                <Icon size={19} aria-hidden="true" />
              </label>
            );
          })}
        </div>

        {scheduled && (
          <div className="editor-row">
            <label>
              Date
              <input
                type="date"
                name="date"
                defaultValue={defaults.scheduled_date ?? ""}
              />
            </label>
            <label>
              Start time
              <input
                type="time"
                name="time"
                defaultValue={defaults.start_time ?? "09:00"}
              />
            </label>
          </div>
        )}

        <DurationPicker duration={duration} onChange={setDuration} />
        <p className="demo-editor-hint">
          Saved only in this demo. Reset or leaving the page clears changes.
        </p>
        <div className="demo-editor-actions">
          <button type="button" className="text-button" onClick={onClose}>
            Cancel
          </button>
          <button className="demo-primary-button" type="submit">
            Save in demo
          </button>
        </div>
      </form>
    </div>
  );
}
