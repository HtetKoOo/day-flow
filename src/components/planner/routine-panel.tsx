"use client";

import { CalendarClock, ChevronRight, Plus } from "lucide-react";
import { routineDaysLabel, type Routine } from "@/lib/tasks/routines";

export function RoutinePanel({
  routines,
  onAdd,
  onEdit,
}: {
  routines: Routine[];
  onAdd: () => void;
  onEdit: (routine: Routine) => void;
}) {
  return (
    <div className="routine-panel">
      <button type="button" className="routine-add" onClick={onAdd}>
        <Plus size={19} /> Add routine
      </button>
      {routines.length ? (
        <ul className="routine-list">
          {routines.map((routine) => (
            <li key={routine.id}>
              <button
                type="button"
                className={`routine-card ${routine.is_active ? "" : "is-paused"}`}
                onClick={() => onEdit(routine)}
                aria-label={`Edit ${routine.title} routine`}
              >
                <CalendarClock size={18} />
                <div>
                  <strong>{routine.title}</strong>
                  <span>{routineDaysLabel(routine.days_of_week)}</span>
                  <small>
                    {routine.is_active ? "Active" : "Paused"} ·{" "}
                    {routine.start_time.slice(0, 5)} ·{" "}
                    {routine.duration_minutes} min · Weekly
                  </small>
                </div>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="routine-empty">
          <CalendarClock size={22} />
          <p>
            Set your weekly routine once. It will appear on your timetable
            automatically.
          </p>
        </div>
      )}
    </div>
  );
}
