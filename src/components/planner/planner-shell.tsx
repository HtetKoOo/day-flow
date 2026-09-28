"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, useSyncExternalStore } from "react";
import { PlannerToast } from "./planner-toast";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent, type DragStartEvent, type Modifier } from "@dnd-kit/core";
import { InboxDropZone, scheduleCollision } from "./drag-schedule";
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
  LoaderCircle,
} from "lucide-react";
import { InboxPanel } from "@/components/planner/inbox-panel";
import { TaskEditor } from "@/components/planner/task-editor";
import { RoutinePanel } from "@/components/planner/routine-panel";
import { RoutineEditor } from "@/components/planner/routine-editor";
import { DateStrip } from "@/components/planner/date-strip";
import { Timeline, timelineMarker, timelineTaskHeight } from "@/components/planner/timeline";
import { plannerHref, type PlannerView, usePlannerNavigation } from "@/components/planner/use-planner-navigation";
import { completeTask, scheduleTask } from "@/app/planner/actions";
import { dateKey, minutes, plannerRange } from "@/lib/tasks/schedule";
import { clockTime } from "@/lib/tasks/agenda";
import { taskColor } from "@/lib/tasks/colors";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { InboxTask, ScheduledTask, TaskResult } from "@/lib/tasks/types";
import type { Routine } from "@/lib/tasks/routines";

/* DragOverlay starts at the source element's rectangle. Compensate for the
 * point where the pointer grabbed it so the circular overlay is centred under
 * the cursor for both an Inbox handle and a full timeline task. */
const centerOverlayOnCursor: Modifier = ({
  activatorEvent,
  activeNodeRect,
  overlayNodeRect,
  transform,
}) => {
  const pointer = activatorEvent as MouseEvent | null;
  if (
    !pointer ||
    typeof pointer.clientX !== "number" ||
    !activeNodeRect ||
    !overlayNodeRect
  ) {
    return transform;
  }
  return {
    ...transform,
    x:
      transform.x +
      pointer.clientX -
      activeNodeRect.left -
      overlayNodeRect.width / 2,
    y:
      transform.y +
      pointer.clientY -
      activeNodeRect.top -
      overlayNodeRect.height / 2,
  };
};


/**
 * Range columns share one visual clock. Each 15-minute slot gets a calm base
 * height, then expands only where a task needs room for its circle/capsule.
 * Thus simultaneous times align across days, adjacent tasks meet exactly, and
 * an actual free interval always remains visible.
 */
function buildRangeTimeAxis(tasks: ScheduledTask[], compact: boolean) {
  const start = 6 * 60;
  const end = 22 * 60;
  const slotHeights = new Map<number, number>();
  for (let minute = start; minute < end; minute += 15) slotHeights.set(minute, 12);

  for (const task of tasks) {
    const taskStart = Math.max(start, minutes(task.start_time));
    const taskEnd = Math.min(end, taskStart + task.duration_minutes);
    const first = Math.floor(taskStart / 15) * 15;
    const last = Math.ceil(taskEnd / 15) * 15;
    const slots = Math.max(1, (last - first) / 15);
    const minimumPerSlot = timelineTaskHeight(task.duration_minutes, compact) / slots;
    for (let minute = first; minute < last; minute += 15) {
      slotHeights.set(minute, Math.max(slotHeights.get(minute) ?? 12, minimumPerSlot));
    }
  }

  const positions: Record<number, number> = { [start]: 0 };
  let height = 0;
  for (let minute = start; minute < end; minute += 15) {
    height += slotHeights.get(minute) ?? 12;
    positions[minute + 15] = height;
  }
  return { start, end, positions, height };
}

type VisualDropTarget = { minute: number; top: number };

/**
 * The agenda intentionally compresses long free intervals, so its pixels do
 * not map linearly to wall-clock time. Resolve the pointer within the actual
 * card or free-gap it is above, then project the snapped time back onto that
 * same visual segment.
 */
function visualDropTarget(day: string, pointerY: number): VisualDropTarget | null {
  const agenda = [...document.querySelectorAll<HTMLElement>("[data-timeline-day]")]
    .find((element) => element.dataset.timelineDay === day);
  if (!agenda) return null;

  const segments = [...agenda.querySelectorAll<HTMLElement>("[data-timeline-segment]")]
    .map((element) => {
      const start = element.dataset.start;
      const end = element.dataset.end;
      if (!start || !end) return null;
      const rect = element.getBoundingClientRect();
      return {
        start: minutes(start),
        end: minutes(end),
        rect,
        kind: element.dataset.timelineSegmentKind ?? "gap",
      };
    })
    .filter((segment): segment is {
      start: number;
      end: number;
      rect: DOMRect;
      kind: string;
    } => Boolean(segment))
    .sort((left, right) => left.rect.top - right.rect.top);

  if (!segments.length) return null;

  const agendaRect = agenda.getBoundingClientRect();
  const first = segments[0];
  const last = segments[segments.length - 1];
  let start = first.start;
  let end = last.end;
  let top = agendaRect.top;
  let bottom = agendaRect.bottom;

  const containsPointer = (segment: typeof segments[number]) =>
    pointerY >= segment.rect.top && pointerY <= segment.rect.bottom;
  // In range views a free interval can sit behind the task it connects. A
  // task must win when both rectangles contain the pointer.
  const activeSegment = segments.find(
    (segment) => segment.kind === "task" && containsPointer(segment),
  ) ?? segments.find(containsPointer);
  if (activeSegment) {
    start = activeSegment.start;
    end = activeSegment.end;
    top = activeSegment.rect.top;
    bottom = activeSegment.rect.bottom;
  } else if (pointerY < first.rect.top) {
    start = 6 * 60;
    end = first.start;
    top = agendaRect.top;
    bottom = first.rect.top;
  } else if (pointerY > last.rect.bottom) {
    start = last.end;
    end = 22 * 60;
    top = last.rect.bottom;
    bottom = agendaRect.bottom;
  } else {
    const next = segments.find((segment) => segment.rect.top > pointerY);
    const previous = next ? segments[segments.indexOf(next) - 1] : last;
    if (next && previous) {
      start = previous.end;
      end = next.start;
      top = previous.rect.bottom;
      bottom = next.rect.top;
    }
  }

  if (end <= start || bottom <= top) return null;
  const ratio = Math.max(0, Math.min(1, (pointerY - top) / (bottom - top)));
  const minute = Math.round((start + ratio * (end - start)) / 15) * 15;
  const snappedRatio = Math.max(0, Math.min(1, (minute - start) / (end - start)));
  return { minute, top: top + snappedRatio * (bottom - top) - agendaRect.top };
}

export type PlannerProps = {
  stripDays: string[];
  loadedDays: string[];
  timezone: string;
  tasks: InboxTask[];
  inboxError: boolean;
  total: number;
  scheduled: ScheduledTask[];
  scheduleError: boolean;
  scheduledCount: number;
  today: string;
  range: ReturnType<typeof plannerRange>;
  weekStartsOn: number;
  routines: Routine[];
};
export function PlannerShell({
  loadedDays,
  timezone,
  tasks,
  inboxError,
  total,
  scheduled,
  scheduleError,
  scheduledCount,
  today,
  range,
  weekStartsOn,
  routines,
}: PlannerProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<{
    task: InboxTask | null;
    date: string;
    time?: string;
  } | null>(null);
  const [mobile, setMobile] = useState("planner");
  const [sidebarMode, setSidebarMode] = useState<"inbox" | "routines">("inbox");
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [notice, setNotice] = useState<TaskResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragTask, setDragTask] = useState<InboxTask | null>(null);
  const [dragTarget, setDragTarget] = useState<{ day: string; time: string; top: number } | null>(null);
  const dragTargetRef = useRef<{ day: string; time: string; top: number } | null>(null);
  const dragPointer = useRef<{ y: number } | null>(null);
  const queuedDragMove = useRef<DragMoveEvent | null>(null);
  const dragMoveFrame = useRef<number | null>(null);
  const pointerInitiatedDrag = useRef(false);
  const [undoAction, setUndoAction] = useState<
    { kind: "schedule" | "completion"; task: InboxTask } | null
  >(null);
  // Keep the result of a move in memory immediately. The server action still
  // confirms it in the background, but the timeline no longer waits for a
  // round trip before reflecting the drop.
  const [display, setDisplay] = useState(() => ({
    tasks,
    scheduled,
    total,
    sourceTasks: tasks,
    sourceScheduled: scheduled,
    sourceTotal: total,
  }));
  const receivedScheduleMessages = useRef(new Set<string>());
  if (
    display.sourceTasks !== tasks
    || display.sourceScheduled !== scheduled
    || display.sourceTotal !== total
  ) {
    setDisplay({
      tasks,
      scheduled,
      total,
      sourceTasks: tasks,
      sourceScheduled: scheduled,
      sourceTotal: total,
    });
  }
  const displayTasks = display.tasks;
  const displayScheduled = display.scheduled;
  const displayTotal = display.total;
  const applySchedule = useCallback((task: InboxTask, day: string | null, time: string | null) => {
    const movesToInbox = !day || !time;
    setDisplay((current) => {
      const existingInbox = current.tasks.find((item) => item.id === task.id);
      const existingScheduled = current.scheduled.find((item) => item.id === task.id);
      const wasInInbox = Boolean(existingInbox);
      const nextTask = {
        ...(existingInbox ?? existingScheduled ?? task),
        ...task,
        scheduled_date: day,
        start_time: time,
      };
      return {
        ...current,
        tasks: movesToInbox
          ? [...current.tasks.filter((item) => item.id !== task.id), nextTask]
          : current.tasks.filter((item) => item.id !== task.id),
        scheduled: movesToInbox
          ? current.scheduled.filter((item) => item.id !== task.id)
          : [
              ...current.scheduled.filter((item) => item.id !== task.id),
              nextTask as ScheduledTask,
            ],
        total: wasInInbox === movesToInbox
          ? current.total
          : Math.max(0, current.total + (movesToInbox ? 1 : -1)),
      };
    });
  }, []);
  const publishSchedule = useCallback((task: InboxTask, day: string | null, time: string | null) => {
    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    const message = { type: "schedule", id, task, day, time };
    try {
      const channel = new BroadcastChannel("dayflow-planner");
      channel.postMessage(message);
      channel.close();
    } catch {}
    try {
      localStorage.setItem("dayflow-planner-sync", JSON.stringify(message));
      localStorage.removeItem("dayflow-planner-sync");
    } catch {}
  }, []);
  useEffect(() => {
    const receive = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const payload = message as { id?: string; type?: string; task?: InboxTask; day?: string | null; time?: string | null };
      if (payload.type === "schedule" && payload.task && typeof payload.task.id === "string") {
        if (payload.id && receivedScheduleMessages.current.has(payload.id)) return;
        if (payload.id) {
          receivedScheduleMessages.current.add(payload.id);
          if (receivedScheduleMessages.current.size > 100) {
            const oldest = receivedScheduleMessages.current.values().next().value;
            if (oldest) receivedScheduleMessages.current.delete(oldest);
          }
        }
        applySchedule(payload.task, payload.day ?? null, payload.time ?? null);
      }
    };
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("dayflow-planner");
      channel.onmessage = (event) => receive(event.data);
    } catch {}
    const receiveStorage = (event: StorageEvent) => {
      if (event.key !== "dayflow-planner-sync" || !event.newValue) return;
      try {
        receive(JSON.parse(event.newValue));
      } catch {}
    };
    window.addEventListener("storage", receiveStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", receiveStorage);
    };
  }, [applySchedule]);
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("dayflow-planner-tasks")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          const row = payload.new as Partial<InboxTask>;
          if (
            typeof row.id !== "string"
            || typeof row.title !== "string"
            || typeof row.notes !== "string"
            || typeof row.duration_minutes !== "number"
            || typeof row.is_completed !== "boolean"
          ) {
            router.refresh();
            return;
          }
          applySchedule(
            row as InboxTask,
            typeof row.scheduled_date === "string" ? row.scheduled_date : null,
            typeof row.start_time === "string" ? row.start_time.slice(0, 5) : null,
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applySchedule, router]);
  useEffect(() => {
    if (!dragTask) return;
    const trackPointer = (event: PointerEvent) => {
      dragPointer.current = { y: event.clientY };
    };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    return () => window.removeEventListener("pointermove", trackPointer);
  }, [dragTask]);
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
    applySchedule(task, day, time);
    startTransition(async () => {
      try {
        const result = await scheduleTask({ id: task.id, scheduled_date: day,
          start_time: time, duration_minutes: task.duration_minutes });
        setNotice(result);
        if (result.ok) {
          publishSchedule(task, day, time);
          setUndoAction(undo ? null : { kind: "schedule", task });
        } else {
          applySchedule({ ...task, scheduled_date: day, start_time: time }, task.scheduled_date ?? null, task.start_time ?? null);
        }
      } catch {
        applySchedule({ ...task, scheduled_date: day, start_time: time }, task.scheduled_date ?? null, task.start_time ?? null);
        setNotice({ ok: false, message: "Couldn’t confirm the schedule. Refresh to check before retrying." });
      }
    });
  }
  function finishDrag(event: DragEndEvent) {
    const shouldClearPointerFocus = pointerInitiatedDrag.current;
    pointerInitiatedDrag.current = false;
    setDragTask(null);
    dragPointer.current = null;
    if (shouldClearPointerFocus) {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.closest("[data-draggable]")) active.blur();
      });
    }
    flushDragMove();
    const target = dragTargetRef.current;
    dragTargetRef.current = null;
    const task = event.active.data.current?.task as InboxTask | undefined;
    setDragTarget(null);
    if (!task || pending) return;
    if (event.over?.data.current?.kind === "inbox") {
      persistSchedule(task, null, null);
      return;
    }
    if (!target) return;
    persistSchedule(task, target.day, target.time);
  }
  function updateDragTarget(event: DragMoveEvent) {
    const day = event.over?.data.current?.day;
    const surface = event.over?.rect;
    const task = event.active.data.current?.task as InboxTask | undefined;
    const activeRect = event.active.rect.current.translated;
    if (typeof day !== "string" || !surface || !task || !activeRect) {
      dragTargetRef.current = null;
      setDragTarget(null);
      return;
    }
    // The pointer, rather than the source card's centre, picks the time. This
    // keeps a task visually attached to the cursor and makes 15 minute drops
    // feel direct even when source cards have different heights.
    const pointerY = dragPointer.current?.y ?? activeRect.top + activeRect.height / 2;
    const visualTarget = visualDropTarget(day, pointerY);
    const ratio = Math.max(0, Math.min(1, (pointerY - surface.top) / surface.height));
    const earliest = 6 * 60;
    const latest = 22 * 60 - task.duration_minutes;
    const minute = Math.max(
      earliest,
      Math.min(
        latest,
        visualTarget?.minute ?? Math.round((earliest + ratio * (22 * 60 - earliest)) / 15) * 15,
      ),
    );
    const target = {
      day,
      time: clockTime(minute),
      top: visualTarget?.top ?? ratio * surface.height,
    };
    dragTargetRef.current = target;
    setDragTarget((current) =>
      current?.day === target.day
      && current.time === target.time
      && Math.abs(current.top - target.top) < 0.5
        ? current
        : target,
    );
  }
  function flushDragMove() {
    if (dragMoveFrame.current !== null) {
      cancelAnimationFrame(dragMoveFrame.current);
      dragMoveFrame.current = null;
    }
    const event = queuedDragMove.current;
    queuedDragMove.current = null;
    if (event) updateDragTarget(event);
  }
  function moveDrag(event: DragMoveEvent) {
    queuedDragMove.current = event;
    if (dragMoveFrame.current !== null) return;
    dragMoveFrame.current = requestAnimationFrame(() => {
      dragMoveFrame.current = null;
      const latest = queuedDragMove.current;
      queuedDragMove.current = null;
      if (latest) updateDragTarget(latest);
    });
  }
  function beginDrag(event: DragStartEvent) {
    pointerInitiatedDrag.current = "clientX" in event.activatorEvent;
    const pointer = event.activatorEvent as PointerEvent;
    const pointerY = pointer.clientY;
    dragPointer.current = typeof pointerY === "number" ? { y: pointerY } : null;
    dragTargetRef.current = null;
    queuedDragMove.current = null;
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
  const {
    displayedRange,
    displayedView,
    displayedDay,
    displayedDays,
    displayedStripDays,
    isRangeView,
    isNavigatingTo,
    navigate,
    routeStillLoading,
    showRoutePending,
  } = usePlannerNavigation({
    today,
    range,
    loadedDays,
    weekStartsOn,
    router,
  });
  function changeView(view: PlannerView) {
    navigate(displayedDay, view);
  }
  const href = plannerHref;
  const scheduledByDay = useMemo(() => {
    const byDay = new Map<string, ScheduledTask[]>();
    for (const task of displayScheduled) {
      const tasksForDay = byDay.get(task.scheduled_date) ?? [];
      tasksForDay.push(task);
      byDay.set(task.scheduled_date, tasksForDay);
    }
    return byDay;
  }, [displayScheduled]);
  const selectedScheduled = useMemo(
    () => displayScheduled.filter((task) => displayedDays.includes(task.scheduled_date)),
    [displayScheduled, displayedDays],
  );
  const timeAxis = useMemo(
    () => isRangeView ? buildRangeTimeAxis(selectedScheduled, displayedRange.week) : undefined,
    [displayedRange.week, isRangeView, selectedScheduled],
  );
  const inboxOpen = useSyncExternalStore(subscribeInbox, readInbox, () => true);
  function setInboxVisibility(open: boolean) {
    try {
      localStorage.setItem("dayflow-inbox", open ? "open" : "closed");
    } catch {}
    window.dispatchEvent(new Event("dayflow-inbox-change"));
  }
  function selectSidebar(mode: "inbox" | "routines") {
    if (isMobile) {
      if (mobile === "inbox" && sidebarMode === mode) {
        setMobile("planner");
        setInboxVisibility(false);
        return;
      }
      setSidebarMode(mode);
      setMobile("inbox");
      setInboxVisibility(true);
      return;
    }
    if (inboxOpen && sidebarMode === mode) {
      setInboxVisibility(false);
      return;
    }
    setSidebarMode(mode);
    setInboxVisibility(true);
  }
  function open(
    task: InboxTask | null = null,
    date = displayedDay,
    time?: string,
  ) {
    // Routine blocks are calculated from their weekly rule, so they do not
    // have a task row that the task editor can save. Open that rule directly
    // instead of passing its virtual ID to saveTask.
    if (task?.is_routine) {
      const routine = routines.find((item) => item.id === task.routine_id);
      if (routine) {
        setEditingRoutine(routine);
        setRoutineEditorOpen(true);
      } else {
        selectSidebar("routines");
        setNotice({
          ok: false,
          message: "Couldn’t find that routine. Refresh and try again.",
        });
      }
      return;
    }
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
    const dayTasks = scheduledByDay.get(day) ?? [];
    const incomplete = scheduleError || scheduledCount > scheduled.length;
    return (
      <Link
        key={day}
        href={href(day, displayedView)}
        className="date-cell"
        aria-current={day === displayedDay ? "date" : undefined}
        data-today={day === today}
        aria-label={`${format(parseISO(day), "EEEE, MMMM d")}${day === today ? ", today" : ""}, ${incomplete ? "task preview unavailable" : `${dayTasks.length} tasks`}`}
        onClick={(event) => {
          if (
            isRangeView ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) return;
          event.preventDefault();
          if (day === displayedDay) return;
          navigate(day, displayedView);
        }}
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
        if (dragMoveFrame.current !== null) cancelAnimationFrame(dragMoveFrame.current);
        dragMoveFrame.current = null;
        queuedDragMove.current = null;
        dragTargetRef.current = null;
        setDragTask(null);
        setDragTarget(null);
        dragPointer.current = null;
      }}
      onDragEnd={finishDrag}>
    <main className="planner-app" data-inbox-open={inboxOpen}>
      <header className="app-header">
        <nav className="view-switch sidebar-switch" aria-label="Sidebar panels">
          <button
            type="button"
            className="text-button"
            aria-pressed={inboxOpen && sidebarMode === "inbox"}
            aria-controls="planner-inbox"
            onClick={() => selectSidebar("inbox")}
          >
            <Inbox size={19} />
            <span>Tasks</span>
            {displayTotal > 0 && <span className="sidebar-switch-count">{displayTotal}</span>}
          </button>
          <button
            type="button"
            className="text-button"
            aria-pressed={inboxOpen && sidebarMode === "routines"}
            aria-controls="planner-inbox"
            onClick={() => selectSidebar("routines")}
          >
            <CalendarDays size={19} />
            <span>Routines</span>
          </button>
        </nav>
        <div className="calendar-navigation">
          <div className="date-navigation">
            <h1>{format(parseISO(displayedDay), "MMM yyyy")}</h1>
            <button
              type="button"
              className="icon-button"
              aria-label="Previous week"
              aria-busy={isNavigatingTo(dateKey(addDays(parseISO(displayedDay), -7)), displayedView)}
              onClick={() => navigate(dateKey(addDays(parseISO(displayedDay), -7)), displayedView)}
            >
              {isNavigatingTo(dateKey(addDays(parseISO(displayedDay), -7)), displayedView)
                ? <LoaderCircle className="planner-spinner" size={18} />
                : <ChevronLeft size={18} />}
            </button>
            <button
              type="button"
              className="text-button planner-today"
              onClick={() => navigate(today, displayedView)}
              aria-current={displayedDay === today ? "date" : undefined}
            >
              Today
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Next week"
              aria-busy={isNavigatingTo(dateKey(addDays(parseISO(displayedDay), 7)), displayedView)}
              onClick={() => navigate(dateKey(addDays(parseISO(displayedDay), 7)), displayedView)}
            >
              {isNavigatingTo(dateKey(addDays(parseISO(displayedDay), 7)), displayedView)
                ? <LoaderCircle className="planner-spinner" size={18} />
                : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
        <nav className="view-switch" aria-label="Planner views">
          <button
            type="button"
            onClick={() => changeView("day")}
            disabled={routeStillLoading}
            aria-busy={isNavigatingTo(displayedDay, "day")}
            aria-current={displayedView === "day" ? "page" : undefined}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => changeView("two-days")}
            disabled={routeStillLoading}
            aria-busy={isNavigatingTo(displayedDay, "two-days")}
            aria-current={displayedView === "two-days" ? "page" : undefined}
          >
            2 days
          </button>
          <button
            type="button"
            onClick={() => changeView("week")}
            disabled={routeStillLoading}
            aria-busy={isNavigatingTo(displayedDay, "week")}
            aria-current={displayedView === "week" ? "page" : undefined}
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
          <InboxDropZone className="inbox-content">
            {sidebarMode === "inbox" ? (
              <InboxPanel
                tasks={displayTasks}
                total={displayTotal}
                loadError={inboxError}
                pending={pending}
                onComplete={complete}
                onEdit={(task) => {
                  if (task.is_routine) {
                    selectSidebar("routines");
                    setNotice({ ok: true, message: "Manage this weekly routine from the Routines tab." });
                    return;
                  }
                  open(task);
                }}
                onRetry={() => router.refresh()}
              />
            ) : (
              <RoutinePanel
                routines={routines}
                onAdd={() => {
                  setEditingRoutine(null);
                  setRoutineEditorOpen(true);
                }}
                onEdit={(routine) => {
                  setEditingRoutine(routine);
                  setRoutineEditorOpen(true);
                }}
              />
            )}
          </InboxDropZone>
        </aside>
        <section className="planner-main" data-view={displayedView}>
          {evening && displayedDay === today && (
            <Link
              className="tomorrow-shortcut"
              href={href(dateKey(addDays(parseISO(today), 1)), displayedView)}
            >
              Plan tomorrow →
            </Link>
          )}
          <div className={`planner-stage ${showRoutePending ? "is-route-pending" : ""}`} data-view={displayedView} aria-busy={showRoutePending}>
            <div className="planner-view-content">
              {!isRangeView && (
                <DateStrip
                  onMove={(direction) =>
                    navigate(dateKey(addDays(parseISO(displayedDay), direction * 7)), displayedView)
                  }
                >
                  {displayedStripDays.map(renderDate)}
                </DateStrip>
              )}
              {renderTimeline()}
            </div>
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
            open(null, displayedDay, mobile === "planner" ? "09:00" : undefined)
          }
        >
          <Plus size={24} />
        </button>
        <button
          aria-pressed={mobile === "inbox" && sidebarMode === "inbox"}
          onClick={() => selectSidebar("inbox")}
        >
          <Inbox size={20} />
          Tasks {displayTotal > 0 && <span>{displayTotal}</span>}
        </button>
        <button
          aria-pressed={mobile === "inbox" && sidebarMode === "routines"}
          onClick={() => selectSidebar("routines")}
        >
          <CalendarDays size={20} />
          Routines
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
            if (date && !displayedDays.includes(date))
              navigate(date, displayedView);
          }}
          returnFocus={returnFocus}
        />
      )}
      {routineEditorOpen && (
        <RoutineEditor
          date={displayedDay}
          routine={editingRoutine}
          onClose={() => setRoutineEditorOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </main>
    <DragOverlay dropAnimation={null} modifiers={[centerOverlayOnCursor]}>
      {dragTask && (() => {
        const MarkerIcon = timelineMarker(dragTask).icon;
        return (
          <div
            className="schedule-drag-marker"
            data-color={taskColor(dragTask.color)}
            aria-hidden="true"
          >
            <MarkerIcon size={22} strokeWidth={2.4} />
          </div>
        );
      })()}
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
          className={`selected-timelines ${displayedRange.week ? "week-timelines" : displayedRange.twoDays ? "two-day-timelines" : ""}`}
        >
          {displayedDays.map((day) => (
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
                tasks={scheduledByDay.get(day) ?? []}
                onEdit={(task) => open(task)}
                onAdd={(time) => open(null, day, time)}
                onComplete={complete}
                pending={pending}
                compact={displayedRange.week}
                draggingTask={dragTask}
                dragTime={dragTarget?.day === day ? dragTarget.time : null}
                dragPosition={dragTarget?.day === day ? dragTarget.top : null}
                timeAxis={timeAxis}
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
