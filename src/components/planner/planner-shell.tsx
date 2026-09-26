"use client";
import { useCallback, useRef, useState, useTransition, useSyncExternalStore } from "react";
import { PlannerToast } from "./planner-toast";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent, type DragStartEvent } from "@dnd-kit/core";
import { scheduleCollision } from "./drag-schedule";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  CalendarDays,
  Inbox,
} from "lucide-react";
import { InboxPanel } from "@/components/planner/inbox-panel";
import { TaskEditor } from "@/components/planner/task-editor";
import { DateStrip } from "@/components/planner/date-strip";
import { Timeline } from "@/components/planner/timeline";
import { completeTask, scheduleTask } from "@/app/planner/actions";
import { dateKey, type plannerRange } from "@/lib/tasks/schedule";
import { clockTime } from "@/lib/tasks/agenda";
import { taskColor } from "@/lib/tasks/colors";
import type { InboxTask, ScheduledTask, TaskResult } from "@/lib/tasks/types";
export type PlannerProps = {
  stripDays: string[];
  timezone: string;
  tasks: InboxTask[];
  inboxError: boolean;
  total: number;
  scheduled: ScheduledTask[];
  scheduleError: boolean;
  scheduledCount: number;
  today: string;
  range: ReturnType<typeof plannerRange>;
};
export function PlannerShell({
  stripDays,
  timezone,
  tasks,
  inboxError,
  total,
  scheduled,
  scheduleError,
  scheduledCount,
  today,
  range,
}: PlannerProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<{
    task: InboxTask | null;
    date: string;
    time?: string;
  } | null>(null);
  const [mobile, setMobile] = useState("planner");
  const [notice, setNotice] = useState<TaskResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragTask, setDragTask] = useState<InboxTask | null>(null);
  const [dragTarget, setDragTarget] = useState<{ day: string; time: string } | null>(null);
  const dragPointer = useRef<{ y: number } | null>(null);
  const [undoAction, setUndoAction] = useState<
    { kind: "schedule" | "completion"; task: InboxTask } | null
  >(null);
  const dismissNotice = useCallback(() => {
    setNotice(null);
    setUndoAction(null);
  }, []);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 240, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  function persistSchedule(task: InboxTask, day: string | null, time: string | null, undo = false) {
    setNotice(null);
    setUndoAction(null);
    startTransition(async () => {
      try {
        const result = await scheduleTask({ id: task.id, scheduled_date: day,
          start_time: time, duration_minutes: task.duration_minutes });
        setNotice(result);
        if (result.ok) {
          setUndoAction(undo ? null : { kind: "schedule", task });
          router.refresh();
        }
      } catch {
        setNotice({ ok: false, message: "Couldn’t confirm the schedule. Refresh to check before retrying." });
      }
    });
  }
  function finishDrag(event: DragEndEvent) {
    setDragTask(null);
    dragPointer.current = null;
    const target = dragTarget;
    setDragTarget(null);
    const task = event.active.data.current?.task as InboxTask | undefined;
    if (!task || !target || pending) return;
    persistSchedule(task, target.day, target.time);
  }
  function moveDrag(event: DragMoveEvent) {
    const day = event.over?.data.current?.day;
    const surface = event.over?.rect;
    const task = event.active.data.current?.task as InboxTask | undefined;
    const activeRect = event.active.rect.current.translated;
    if (typeof day !== "string" || !surface || !task || !activeRect) {
      setDragTarget(null);
      return;
    }
    // The pointer, rather than the source card's centre, picks the time. This
    // keeps a task visually attached to the cursor and makes 15 minute drops
    // feel direct even when source cards have different heights.
    const pointerY = dragPointer.current
      ? dragPointer.current.y + event.delta.y
      : activeRect.top + activeRect.height / 2;
    const ratio = Math.max(0, Math.min(1, (pointerY - surface.top) / surface.height));
    const earliest = 6 * 60;
    const latest = 22 * 60 - task.duration_minutes;
    const minute = Math.max(earliest, Math.min(latest,
      Math.round((earliest + ratio * (22 * 60 - earliest)) / 15) * 15));
    const time = clockTime(minute);
    setDragTarget((current) =>
      current?.day === day && current.time === time ? current : { day, time },
    );
  }
  function beginDrag(event: DragStartEvent) {
    const pointerY = (event.activatorEvent as PointerEvent).clientY;
    dragPointer.current = typeof pointerY === "number" ? { y: pointerY } : null;
    setDragTask(event.active.data.current?.task as InboxTask);
    setMobile("planner");
  }
  const returnFocus = useRef<HTMLElement | null>(null);
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    readMobile,
    () => false,
  );
  const minute = useSyncExternalStore(subscribeClock, readClock, () => 0);
  const evening =
    minute > 0 &&
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(minute * 60000)),
    ) >= 18;
  const currentView = range.week ? "week" : range.twoDays ? "two-days" : "day";
  const isRangeView = range.week || range.twoDays;
  const inboxOpen = useSyncExternalStore(subscribeInbox, readInbox, () => true);
  function toggleInbox() {
    try {
      localStorage.setItem("dayflow-inbox", inboxOpen ? "closed" : "open");
    } catch {}
    window.dispatchEvent(new Event("dayflow-inbox-change"));
  }
  function href(day: string, view = "day") {
    return `/planner?date=${day}${view !== "day" ? `&view=${view}` : ""}`;
  }
  function changeView(view: "day" | "two-days" | "week") {
    const destination = href(range.day, view);
    const update = () =>
      startTransition(() => router.push(destination, { scroll: false }));
    const viewDocument = document as Document & {
      startViewTransition?: (updateCallback: () => void) => unknown;
    };
    if (viewDocument.startViewTransition) {
      viewDocument.startViewTransition(update);
    } else {
      update();
    }
    setMobile("planner");
  }
  function open(
    task: InboxTask | null = null,
    date = range.day,
    time?: string,
  ) {
    returnFocus.current = document.activeElement as HTMLElement;
    setEditor({ task, date, time });
  }
  function complete(task: InboxTask, undo = false) {
    setNotice(null);
    setUndoAction(null);
    startTransition(async () => {
      try {
        const result = await completeTask({ id: task.id,
          completed: undo ? task.is_completed : !task.is_completed });
        setNotice(result);
        if (result.ok && !undo) setUndoAction({ kind: "completion", task });
      } catch {
        setNotice({
          ok: false,
          message: "Couldn’t confirm that change. Refresh and try again.",
        });
      }
    });
  }
  function renderDate(day: string) {
    const dayTasks = scheduled.filter((t) => t.scheduled_date === day);
    const incomplete = scheduleError || scheduledCount > scheduled.length;
    return (
      <Link
        key={day}
        href={href(day, currentView)}
        className="date-cell"
        aria-current={day === range.day ? "date" : undefined}
        data-today={day === today}
        aria-label={`${format(parseISO(day), "EEEE, MMMM d")}${day === today ? ", today" : ""}, ${incomplete ? "task preview unavailable" : `${dayTasks.length} tasks`}`}
      >
        <span>{format(parseISO(day), "EEE")}</span>
        <strong>{format(parseISO(day), "d")}</strong>
        <span className="date-dots" aria-hidden="true">
          {incomplete ? (
            <span>·</span>
          ) : (
            <>
              {dayTasks.slice(0, 3).map((t) => (
                <i key={t.id} data-color={taskColor(t.color)} />
              ))}
              {dayTasks.length > 3 && <small>+{dayTasks.length - 3}</small>}
            </>
          )}
        </span>
      </Link>
    );
  }
  return (
    <DndContext id="dayflow-planner-drag" sensors={sensors}
      collisionDetection={scheduleCollision}
      onDragStart={beginDrag}
      onDragMove={moveDrag}
      onDragCancel={() => {
        setDragTask(null);
        setDragTarget(null);
        dragPointer.current = null;
      }}
      onDragEnd={finishDrag}>
    <main className="planner-app" data-inbox-open={inboxOpen}>
      <header className="app-header">
        <button
          className="inbox-toggle"
          aria-label="Toggle Inbox"
          aria-expanded={inboxOpen}
          aria-controls="planner-inbox"
          onClick={toggleInbox}
        >
          <Inbox size={20} />
          <span>Inbox</span>
          {total > 0 && <span className="inbox-toggle-count">{total}</span>}
        </button>
        <div className="calendar-navigation">
          <div className="date-navigation">
            <h1>{format(parseISO(range.day), "MMM yyyy")}</h1>
            <Link
              className="icon-button"
              aria-label="Previous week"
              href={href(
                dateKey(addDays(parseISO(range.day), -7)),
                currentView,
              )}
            >
              <ChevronLeft size={18} />
            </Link>
            <Link
              className="icon-button"
              aria-label="Next week"
              href={href(dateKey(addDays(parseISO(range.day), 7)), currentView)}
            >
              <ChevronRight size={18} />
            </Link>
          </div>
          <Link className="text-button" href={href(today, currentView)}>
            Today
          </Link>
        </div>
        <nav className="view-switch" aria-label="Planner views">
          <button
            type="button"
            onClick={() => changeView("day")}
            aria-current={currentView === "day" ? "page" : undefined}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => changeView("two-days")}
            aria-current={range.twoDays ? "page" : undefined}
          >
            2 days
          </button>
          <button
            type="button"
            onClick={() => changeView("week")}
            aria-current={range.week ? "page" : undefined}
          >
            Week
          </button>
        </nav>
        <div className="header-actions">
          <Link className="icon-button" href="/settings" aria-label="Settings">
            <Settings size={20} />
          </Link>
        </div>
      </header>
      {notice && (
        <PlannerToast notice={notice} pending={pending} onDismiss={dismissNotice}
          onUndo={notice.ok && undoAction ? () => {
            const { kind, task } = undoAction;
            if (kind === "completion") complete(task, true);
            else persistSchedule(task, task.scheduled_date ?? null,
              task.start_time?.slice(0, 5) ?? null, true);
          } : undefined} />
      )}
      <div
        className="planner-workspace"
        data-mobile-panel={mobile}
        data-inbox-open={inboxOpen}
      >
        <aside
          id="planner-inbox"
          className="inbox-sidebar"
          inert={isMobile ? mobile !== "inbox" : !inboxOpen}
        >
          <div className="inbox-content">
            <InboxPanel
              tasks={tasks}
              total={total}
              loadError={inboxError}
              pending={pending}
              onComplete={complete}
              onEdit={(task) => open(task)}
              onRetry={() => router.refresh()}
            />
          </div>
        </aside>
        <section className="planner-main" data-view={currentView}>
          {evening && range.day === today && (
            <Link
              className="tomorrow-shortcut"
              href={href(dateKey(addDays(parseISO(today), 1)))}
            >
              Plan tomorrow →
            </Link>
          )}
          <div className="planner-stage" data-view={currentView}>
            {!isRangeView && (
              <DateStrip
                onMove={(direction) =>
                  router.push(
                    href(dateKey(addDays(parseISO(range.day), direction * 7))),
                    { scroll: false },
                  )
                }
              >
                {stripDays.map(renderDate)}
              </DateStrip>
            )}
            {renderTimeline()}
          </div>
        </section>
      </div>
      <nav className="mobile-navigation" aria-label="Mobile planner navigation">
        <button
          aria-pressed={mobile === "planner"}
          onClick={() => setMobile("planner")}
        >
          <CalendarDays size={20} />
          Planner
        </button>
        <button
          className="mobile-create"
          aria-label="Add task"
          onClick={() =>
            open(null, range.day, mobile === "planner" ? "09:00" : undefined)
          }
        >
          <Plus size={24} />
        </button>
        <button
          aria-pressed={mobile === "inbox"}
          onClick={() => setMobile("inbox")}
        >
          <Inbox size={20} />
          Inbox {total > 0 && <span>{total}</span>}
        </button>
      </nav>
      {editor && (
        <TaskEditor
          key={editor.task?.id ?? "new"}
          {...editor}
          timezone={timezone}
          onClose={() => {
            setEditor(null);
          }}
          onSaved={(date) => {
            setMobile(date ? "planner" : "inbox");
            if (date && !range.days.includes(date))
              router.push(href(date, currentView), { scroll: false });
            else router.refresh();
          }}
          returnFocus={returnFocus}
        />
      )}
    </main>
    <DragOverlay dropAnimation={null}>
      {dragTask && (
        <div className="schedule-drag-ghost" data-color={taskColor(dragTask.color)}>
          <strong>{dragTask.title}</strong>
          <span>{dragTask.duration_minutes} min</span>
        </div>
      )}
    </DragOverlay>
    </DndContext>
  );

  function renderTimeline() {
    if (scheduleError) {
      return (
        <div role="alert" className="empty-schedule">
          <p>We couldn’t load your plans.</p>
          <button className="text-button" onClick={() => router.refresh()}>
            Try again
          </button>
        </div>
      );
    }
    return (
      <div className={`timeline-scroll ${isRangeView ? "range-scroll" : ""}`}>
        <div
          className={`selected-timelines ${range.week ? "week-timelines" : range.twoDays ? "two-day-timelines" : ""}`}
        >
          {range.days.map((day) => (
            <section
              key={day}
              className={`timeline-day ${isRangeView ? "range-day" : "day-timeline"}`}
              aria-label={format(parseISO(day), "EEEE, MMMM d")}
              style={{ viewTransitionName: `dayflow-column-${day}` }}
            >
              {isRangeView && (
                <div className="range-date-header">{renderDate(day)}</div>
              )}
              <Timeline
                day={day}
                tasks={scheduled.filter((task) => task.scheduled_date === day)}
                onEdit={(task) => open(task)}
                onAdd={(time) => open(null, day, time)}
                onComplete={complete}
                pending={pending}
                compact={range.week}
                draggingTask={dragTask}
                dragTime={dragTarget?.day === day ? dragTarget.time : null}
              />
            </section>
          ))}
        </div>
      </div>
    );
  }
}

function readInbox() {
  try {
    return localStorage.getItem("dayflow-inbox") !== "closed";
  } catch {
    return true;
  }
}
function subscribeInbox(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("dayflow-inbox-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("dayflow-inbox-change", callback);
  };
}

function readMobile() {
  return window.matchMedia("(max-width: 760px)").matches;
}
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia("(max-width: 760px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function readClock() {
  return Math.floor(Date.now() / 60000);
}
function subscribeClock(callback: () => void) {
  const timer = window.setInterval(callback, 60000);
  return () => window.clearInterval(timer);
}
