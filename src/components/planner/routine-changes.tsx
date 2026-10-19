"use client";

import { useState, useTransition } from "react";
import {
  loadRoutineChanges,
  saveRoutineOccurrence,
} from "@/app/planner/actions";
import { routineExceptionsInRange, type Routine } from "@/lib/tasks/routines";

export function RoutineChanges({
  routine,
  from,
  to,
  onSaved,
}: {
  routine: Routine;
  from: string;
  to: string;
  onSaved: () => void;
}) {
  const [scope, setScope] = useState<"range" | "all">("range");
  const [all, setAll] = useState<NonNullable<Routine["exceptions"]>>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const list = (
    scope === "all"
      ? all
      : routineExceptionsInRange(routine.exceptions ?? [], from, to)
  )
    .filter((item) => !removed.has(item.occurrence_date))
    .sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));

  function showAll() {
    setError("");
    setBusyDate(null);
    startTransition(async () => {
      try {
        const result = await loadRoutineChanges(routine.id);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setAll(result.changes);
        setScope("all");
      } catch {
        setError("Could not load changed days. Please try again.");
      }
    });
  }
  function restore(date: string) {
    setError("");
    setBusyDate(date);
    startTransition(async () => {
      try {
        const result = await saveRoutineOccurrence(routine.id, {
          mode: "reset",
          occurrence_date: date,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setRemoved((previous) => new Set([...previous, date]));
        onSaved();
      } catch {
        setError(
          "Could not confirm restoration. Check your connection and timetable before retrying.",
        );
      } finally {
        setBusyDate(null);
      }
    });
  }

  return (
    <section
      className="mt-6 border-t pt-5"
      aria-labelledby="routine-changes-title"
    >
      <h3 id="routine-changes-title" className="font-medium">
        Changed days
      </h3>
      <div
        className="mt-3 inline-flex rounded-full bg-secondary p-1"
        role="group"
        aria-label="Changed days range"
      >
        <button
          type="button"
          disabled={pending}
          aria-pressed={scope === "range"}
          onClick={() => {
            setScope("range");
            setError("");
          }}
          className={`rounded-full px-3 py-2 text-sm ${scope === "range" ? "bg-card text-primary" : "text-muted-foreground"}`}
        >
          Current range
        </button>
        <button
          type="button"
          disabled={pending}
          aria-pressed={scope === "all"}
          onClick={showAll}
          className={`rounded-full px-3 py-2 text-sm ${scope === "all" ? "bg-card text-primary" : "text-muted-foreground"}`}
        >
          All changes
        </button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {scope === "range"
          ? `${from} to ${to}.`
          : "All dates, sorted from earliest to latest."}{" "}
        Restore a skipped or rescheduled occurrence to its weekly schedule.
      </p>
      {pending && !busyDate && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Loading changes…
        </p>
      )}
      {!pending && !list.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          {scope === "range"
            ? "No changed days in this range. Choose All changes to see other dates."
            : "No changed days for this routine."}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error mt-3">
          {error}
        </p>
      )}
      <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto">
        {list.map((item) => (
          <li
            key={item.occurrence_date}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span>
              {item.occurrence_date} ·{" "}
              {item.is_skipped
                ? "Skipped"
                : `${item.scheduled_date} ${item.start_time?.slice(0, 5)}`}
            </span>
            <button
              type="button"
              className="text-button"
              disabled={pending}
              aria-label={`Restore ${item.occurrence_date}`}
              onClick={() => restore(item.occurrence_date)}
            >
              {pending && busyDate === item.occurrence_date
                ? "Restoring…"
                : "Restore"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
