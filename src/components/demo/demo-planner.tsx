"use client";

import Link from "next/link";
import { DndContext } from "@dnd-kit/core";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LogIn,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Timeline } from "@/components/planner/timeline";
import { DemoRoutineEditor } from "@/components/demo/demo-routine-editor";
import { DemoTaskEditor } from "@/components/demo/demo-task-editor";
import { taskColor } from "@/lib/tasks/colors";
import { taskIcon } from "@/lib/tasks/icons";
import { dateKey, plannerRange } from "@/lib/tasks/schedule";
import type { InboxTask, ScheduledTask } from "@/lib/tasks/types";
import type { DemoRoutine } from "@/lib/demo/sample-plan";
import {
  demoInboxTasks,
  demoRoutines,
  demoScheduledTasks,
} from "@/lib/demo/sample-plan";

type View = "day" | "two-days" | "week";
type Panel = "tasks" | "routines";

function browserToday() {
  return dateKey(new Date());
}

export function DemoPlanner() {
  const [today] = useState(browserToday);
  const [selectedDay, setSelectedDay] = useState(today);
  const [view, setView] = useState<View>("day");
  const [panel, setPanel] = useState<Panel>("tasks");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [customTasks, setCustomTasks] = useState<ScheduledTask[]>([]);
  const [taskEdits, setTaskEdits] = useState<Record<string, ScheduledTask>>({});
  const [inboxEdits, setInboxEdits] = useState<Record<string, InboxTask>>({});
  const [routineEdits, setRoutineEdits] = useState<Record<string, DemoRoutine>>(
    {},
  );
  const [editorTask, setEditorTask] = useState<
    ScheduledTask | null | undefined
  >(undefined);
  const [editorStartTime, setEditorStartTime] = useState<string | undefined>();
  const [inboxEditorTask, setInboxEditorTask] = useState<
    InboxTask | undefined
  >();
  const [routineEditor, setRoutineEditor] = useState<DemoRoutine | undefined>();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const range = useMemo(
    () => plannerRange(today, selectedDay, view, 1),
    [selectedDay, today, view],
  );
  const stripDays = useMemo(() => {
    const first = startOfWeek(parseISO(selectedDay), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) =>
      dateKey(addDays(first, index)),
    );
  }, [selectedDay]);
  const routines = useMemo(
    () =>
      demoRoutines(today).map((routine) => routineEdits[routine.id] ?? routine),
    [routineEdits, today],
  );
  const allScheduled = useMemo(
    () => [
      ...demoScheduledTasks(today, stripDays, routines).map(
        (task) => taskEdits[task.id] ?? task,
      ),
      ...customTasks.filter((task) => stripDays.includes(task.scheduled_date)),
    ],
    [customTasks, routines, stripDays, taskEdits, today],
  );
  const scheduledByDay = useMemo(() => {
    const entries = new Map<string, ScheduledTask[]>();
    for (const task of allScheduled) {
      const items = entries.get(task.scheduled_date) ?? [];
      entries.set(task.scheduled_date, [
        ...items,
        { ...task, is_completed: completed.has(task.id) },
      ]);
    }
    return entries;
  }, [allScheduled, completed]);
  const inbox = useMemo(
    () =>
      demoInboxTasks.map((task) => ({
        ...(inboxEdits[task.id] ?? task),
        is_completed: completed.has(task.id),
      })),
    [completed, inboxEdits],
  );
  const toggleComplete = (task: InboxTask) => {
    if (task.is_routine) {
      setNotice(
        "Routines repeat automatically and stay visible on your timetable.",
      );
      return;
    }
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  };
  const resetDemo = () => {
    setCompleted(new Set());
    setCustomTasks([]);
    setTaskEdits({});
    setInboxEdits({});
    setRoutineEdits({});
    setEditorTask(undefined);
    setInboxEditorTask(undefined);
    setRoutineEditor(undefined);
    setEditorStartTime(undefined);
    setSelectedDay(today);
    setView("day");
    setNotice("Demo reset.");
  };
  const navigate = (amount: number) =>
    setSelectedDay(dateKey(addDays(parseISO(selectedDay), amount)));
  const dateTasks = (day: string) => scheduledByDay.get(day) ?? [];

  return (
    <DndContext id="dayflow-demo-drag">
      <main className="planner-app demo-planner">
        <header className="app-header">
          <nav className="view-switch sidebar-switch" aria-label="Demo panels">
            <button
              type="button"
              aria-pressed={panel === "tasks"}
              onClick={() => setPanel("tasks")}
            >
              <Inbox size={19} /> Tasks
              <span className="sidebar-switch-count">{inbox.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={panel === "routines"}
              onClick={() => setPanel("routines")}
            >
              <CalendarDays size={19} /> Routines
            </button>
          </nav>
          <div className="calendar-navigation">
            <div className="date-navigation">
              <h1>{format(parseISO(selectedDay), "MMM yyyy")}</h1>
              <button
                type="button"
                className="icon-button"
                aria-label="Previous week"
                onClick={() => navigate(-7)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="text-button planner-today"
                onClick={() => setSelectedDay(today)}
              >
                Today
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Next week"
                onClick={() => navigate(7)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <nav className="view-switch" aria-label="Demo planner views">
            {(["day", "two-days", "week"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-current={view === option ? "page" : undefined}
                onClick={() => setView(option)}
              >
                {option === "two-days"
                  ? "2 days"
                  : option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <span
              className="demo-badge"
              title="Sample data · Changes reset when you leave"
            >
              Demo
            </span>
            <button
              type="button"
              className="icon-button demo-reset"
              aria-label="Reset demo"
              title="Reset demo"
              onClick={resetDemo}
            >
              <RotateCcw size={18} />
            </button>
            <Link className="text-button demo-login" href="/login">
              <LogIn size={18} /> Use the app
            </Link>
          </div>
        </header>

        {notice && (
          <div className="demo-notice" role="status">
            {notice}
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}

        <div className="planner-workspace">
          <aside className="inbox-sidebar">
            <div className="inbox-content">
              {panel === "tasks" ? (
                <>
                  <p className="demo-sidebar-label">Inbox</p>
                  <ul className="inbox-list">
                    {inbox.map((task) => (
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
                          onClick={() => toggleComplete(task)}
                        >
                          {task.is_completed && <Check size={13} />}
                        </button>
                        <button
                          type="button"
                          className="inbox-card-body"
                          onClick={() => setInboxEditorTask(task)}
                        >
                          <strong>{task.title}</strong>
                          <span>{task.duration_minutes} min</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="routine-panel">
                  <p className="demo-sidebar-label">Weekly routines</p>
                  <ul className="routine-list">
                    {routines.map((routine) => {
                      const RoutineIcon =
                        taskIcon(routine.icon) ?? CalendarDays;
                      return (
                        <li key={routine.id}>
                          <button
                            type="button"
                            className="routine-card"
                            data-color={taskColor(routine.color)}
                            onClick={() => setRoutineEditor(routine)}
                          >
                            <RoutineIcon size={18} />
                            <div>
                              <strong>{routine.title}</strong>
                              <span>
                                {routine.days_of_week.length === 7
                                  ? "Every day"
                                  : "Weekly"}
                              </span>
                              <small>
                                {routine.start_time} ·{" "}
                                {routine.duration_minutes} min
                              </small>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          <section className="planner-main" data-view={view}>
            {view !== "week" && (
              <nav className="date-strip" aria-label="Choose a demo day">
                {stripDays.map((day) => {
                  const tasks = dateTasks(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className="date-cell"
                      aria-current={day === selectedDay ? "date" : undefined}
                      data-today={day === today}
                      onClick={() => setSelectedDay(day)}
                    >
                      <span>{format(parseISO(day), "EEE")}</span>
                      <strong>{format(parseISO(day), "d")}</strong>
                      <span className="date-dots" aria-hidden="true">
                        {tasks.slice(0, 3).map((task) => (
                          <i key={task.id} data-color={taskColor(task.color)} />
                        ))}
                        {tasks.length > 3 && <small>+{tasks.length - 3}</small>}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}
            <div
              className={`timeline-scroll ${view !== "day" ? "range-scroll" : ""}`}
            >
              <div
                className={`selected-timelines ${view === "week" ? "week-timelines" : view === "two-days" ? "two-day-timelines" : ""}`}
              >
                {range.days.map((day) => (
                  <section
                    key={day}
                    className={`timeline-day ${view !== "day" ? "range-day" : "day-timeline"}`}
                    aria-label={format(parseISO(day), "EEEE, MMMM d")}
                  >
                    {view !== "day" && (
                      <div className="range-date-header">
                        <div className="date-cell" data-today={day === today}>
                          <span>{format(parseISO(day), "EEE")}</span>
                          <strong>{format(parseISO(day), "d")}</strong>
                        </div>
                      </div>
                    )}
                    <Timeline
                      day={day}
                      tasks={dateTasks(day)}
                      compact={view === "week"}
                      pending={false}
                      disableDrag
                      onEdit={(task) =>
                        task.is_routine
                          ? setRoutineEditor(
                              routines.find(
                                (routine) => routine.id === task.routine_id,
                              ),
                            )
                          : setEditorTask(task)
                      }
                      onAdd={(time) => {
                        setEditorStartTime(time);
                        setEditorTask(null);
                      }}
                      onComplete={toggleComplete}
                    />
                  </section>
                ))}
              </div>
            </div>
          </section>
        </div>
        {editorTask !== undefined && (
          <DemoTaskEditor
            task={editorTask}
            date={selectedDay}
            startTime={editorStartTime}
            onClose={() => {
              setEditorTask(undefined);
              setEditorStartTime(undefined);
            }}
            onSave={(task) => {
              if (!task.scheduled_date || !task.start_time) return;
              const scheduledTask = task as ScheduledTask;
              if (
                demoScheduledTasks(today, stripDays, routines).some(
                  (item) => item.id === scheduledTask.id,
                )
              )
                setTaskEdits((current) => ({
                  ...current,
                  [scheduledTask.id]: scheduledTask,
                }));
              else
                setCustomTasks((current) => [
                  ...current.filter((item) => item.id !== scheduledTask.id),
                  scheduledTask,
                ]);
              setEditorTask(undefined);
              setEditorStartTime(undefined);
              setNotice("Saved in demo.");
            }}
          />
        )}
        {inboxEditorTask && (
          <DemoTaskEditor
            task={inboxEditorTask}
            scheduled={false}
            onClose={() => setInboxEditorTask(undefined)}
            onSave={(task) => {
              setInboxEdits((current) => ({ ...current, [task.id]: task }));
              setInboxEditorTask(undefined);
              setNotice("Saved in demo.");
            }}
          />
        )}
        {routineEditor && (
          <DemoRoutineEditor
            routine={routineEditor}
            onClose={() => setRoutineEditor(undefined)}
            onSave={(routine) => {
              setRoutineEdits((current) => ({
                ...current,
                [routine.id]: routine,
              }));
              setRoutineEditor(undefined);
              setNotice("Saved in demo.");
            }}
          />
        )}
      </main>
    </DndContext>
  );
}
