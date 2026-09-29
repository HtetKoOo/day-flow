"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { DurationPicker } from "@/components/planner/duration-picker";
import { demoTaskColors, demoTaskIconNames } from "@/lib/demo/palette";
import { taskIcon, type TaskIconName } from "@/lib/tasks/icons";
import { weekdayLabels } from "@/lib/tasks/routines";
import type { DemoRoutine } from "@/lib/demo/sample-plan";

export function DemoRoutineEditor({
  routine,
  onClose,
  onSave,
}: {
  routine: DemoRoutine;
  onClose: () => void;
  onSave: (routine: DemoRoutine) => void;
}) {
  const [duration, setDuration] = useState(routine.duration_minutes);

  return (
    <div className="demo-editor-backdrop" role="presentation">
      <form
        className="demo-editor"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const daysOfWeek = weekdayLabels
            .map((_, index) => index)
            .filter((day) => form.get(`day-${day}`) === "on");
          onSave({
            ...routine,
            title: String(form.get("title")).trim(),
            color: String(form.get("color")),
            icon: String(form.get("icon")) as TaskIconName,
            start_time: String(form.get("time")),
            duration_minutes: duration,
            days_of_week: daysOfWeek.length ? daysOfWeek : routine.days_of_week,
          });
        }}
      >
        <div className="sheet-heading">
          <h2>Edit routine</h2>
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
          defaultValue={routine.title}
          required
          autoFocus
          maxLength={200}
        />
        <label className="demo-editor-label">Color</label>
        <div className="color-picker" aria-label="Routine color">
          {demoTaskColors.map((color) => (
            <label key={color} data-color={color} className="color-dot">
              <input
                type="radio"
                name="color"
                value={color}
                aria-label={`${color} color`}
                defaultChecked={routine.color === color}
              />
              <Check size={15} aria-hidden="true" />
            </label>
          ))}
        </div>
        <label className="demo-editor-label">Icon</label>
        <div className="demo-icon-picker" aria-label="Routine icon">
          {demoTaskIconNames.map((name) => {
            const Icon = taskIcon(name)!;
            return (
              <label key={name} title={name}>
                <input
                  type="radio"
                  name="icon"
                  value={name}
                  aria-label={name}
                  defaultChecked={routine.icon === name}
                />
                <Icon size={19} aria-hidden="true" />
              </label>
            );
          })}
        </div>
        <label className="demo-editor-label">Repeats every</label>
        <div className="demo-weekdays">
          {weekdayLabels.map((label, day) => (
            <label key={label}>
              <input
                type="checkbox"
                name={`day-${day}`}
                defaultChecked={routine.days_of_week.includes(day)}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="editor-row">
          <label>
            Start time
            <input type="time" name="time" defaultValue={routine.start_time} />
          </label>
        </div>
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
