"use client";
import { useMemo, useRef, useState } from "react";
import { PlannerToast } from "./planner-toast";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { scheduleCollision } from "./drag-schedule";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, parseISO } from "date-fns";
import { TaskEditor } from "@/components/planner/task-editor";
import { RoutineEditor } from "@/components/planner/routine-editor";
import { DateStrip } from "@/components/planner/date-strip";
import { timelineMarker } from "@/components/planner/timeline";
import {
  plannerHref,
  usePlannerNavigation,
} from "@/components/planner/use-planner-navigation";
import { usePlannerTaskDisplay } from "@/components/planner/use-planner-task-display";
import {
  centerOverlayOnCursor,
  usePlannerDrag,
} from "@/components/planner/use-planner-drag";
import { usePlannerShellState } from "@/components/planner/use-planner-shell-state";
import { usePlannerTaskActions } from "@/components/planner/use-planner-task-actions";
import { buildRangeTimeAxis } from "@/components/planner/planner-time-axis";
import { PlannerHeader } from "@/components/planner/planner-header";
import { PlannerSidebar } from "@/components/planner/planner-sidebar";
import { PlannerMobileNavigation } from "@/components/planner/planner-mobile-navigation";
import { PlannerTimelineContent } from "@/components/planner/planner-timeline-content";
import { PlannerDateCell } from "@/components/planner/planner-date-cell";
import { dateKey, plannerRange } from "@/lib/tasks/schedule";
import { taskColor } from "@/lib/tasks/colors";
import type { InboxTask, ScheduledTask } from "@/lib/tasks/types";
import type { Routine } from "@/lib/tasks/routines";

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
  const [routineEditorOpen, setRoutineEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  // Keep the result of a move in memory immediately. The server action still
  // confirms it in the background, but the timeline no longer waits for a
  // round trip before reflecting the drop.
  const {
    displayTasks,
    displayScheduled,
    displayTotal,
    applySchedule,
    publishSchedule,
  } = usePlannerTaskDisplay({ tasks, scheduled, total, router });
  const {
    notice,
    pending,
    dismissNotice,
    persistSchedule,
    complete,
    undo,
    showNotice,
  } = usePlannerTaskActions({ applySchedule, publishSchedule });
  const {
    sensors,
    dragTask,
    dragTarget,
    onDragStart,
    onDragMove,
    onDragEnd,
    onDragCancel,
  } = usePlannerDrag({
    pending,
    onSchedule: persistSchedule,
    onStart: () => setMobile("planner"),
  });
  const returnFocus = useRef<HTMLElement | null>(null);
  const {
    mobile,
    setMobile,
    sidebarMode,
    isMobile,
    inboxOpen,
    evening,
    selectSidebar,
  } = usePlannerShellState(timezone);
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
    () =>
      displayScheduled.filter((task) =>
        displayedDays.includes(task.scheduled_date),
      ),
    [displayScheduled, displayedDays],
  );
  const timeAxis = useMemo(
    () =>
      isRangeView
        ? buildRangeTimeAxis(selectedScheduled, displayedRange.week)
        : undefined,
    [displayedRange.week, isRangeView, selectedScheduled],
  );
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
        showNotice({
          ok: false,
          message: "Couldn’t find that routine. Refresh and try again.",
        });
      }
      return;
    }
    returnFocus.current = document.activeElement as HTMLElement;
    setEditor({ task, date, time });
  }
  const incompleteDatePreview =
    scheduleError || scheduledCount > scheduled.length;
  const renderDate = (day: string) => (
    <PlannerDateCell
      key={day}
      day={day}
      today={today}
      displayedDay={displayedDay}
      isRangeView={isRangeView}
      tasks={scheduledByDay.get(day) ?? []}
      incomplete={incompleteDatePreview}
      href={href(day, displayedView)}
      onNavigate={(nextDay) => navigate(nextDay, displayedView)}
    />
  );
  return (
    <DndContext
      id="dayflow-planner-drag"
      sensors={sensors}
      collisionDetection={scheduleCollision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      <main className="planner-app" data-inbox-open={inboxOpen}>
        <PlannerHeader
          displayedDay={displayedDay}
          displayedView={displayedView}
          today={today}
          inboxOpen={inboxOpen}
          sidebarMode={sidebarMode}
          displayTotal={displayTotal}
          routeStillLoading={routeStillLoading}
          selectSidebar={selectSidebar}
          navigate={navigate}
          isNavigatingTo={isNavigatingTo}
        />
        {notice && (
          <PlannerToast
            notice={notice}
            pending={pending}
            onDismiss={dismissNotice}
            onUndo={undo}
          />
        )}
        <div
          className="planner-workspace"
          data-mobile-panel={mobile}
          data-inbox-open={inboxOpen}
        >
          <PlannerSidebar
            mobile={mobile}
            isMobile={isMobile}
            inboxOpen={inboxOpen}
            sidebarMode={sidebarMode}
            tasks={displayTasks}
            total={displayTotal}
            loadError={inboxError}
            pending={pending}
            routines={routines}
            onComplete={complete}
            onEditTask={(task) => {
              if (task.is_routine) {
                selectSidebar("routines");
                showNotice({
                  ok: true,
                  message: "Manage this weekly routine from the Routines tab.",
                });
                return;
              }
              open(task);
            }}
            onRetry={() => router.refresh()}
            onAddRoutine={() => {
              setEditingRoutine(null);
              setRoutineEditorOpen(true);
            }}
            onEditRoutine={(routine) => {
              setEditingRoutine(routine);
              setRoutineEditorOpen(true);
            }}
          />
          <section className="planner-main" data-view={displayedView}>
            {evening && displayedDay === today && (
              <Link
                className="tomorrow-shortcut"
                href={href(dateKey(addDays(parseISO(today), 1)), displayedView)}
              >
                Plan tomorrow →
              </Link>
            )}
            <div
              className={`planner-stage ${showRoutePending ? "is-route-pending" : ""}`}
              data-view={displayedView}
              aria-busy={showRoutePending}
            >
              <div className="planner-view-content">
                {!isRangeView && (
                  <DateStrip
                    onMove={(direction) =>
                      navigate(
                        dateKey(addDays(parseISO(displayedDay), direction * 7)),
                        displayedView,
                      )
                    }
                  >
                    {displayedStripDays.map(renderDate)}
                  </DateStrip>
                )}
                <PlannerTimelineContent
                  scheduleError={scheduleError}
                  onRetry={() => router.refresh()}
                  isRangeView={isRangeView}
                  isWeek={displayedRange.week}
                  isTwoDays={displayedRange.twoDays}
                  days={displayedDays}
                  scheduledByDay={scheduledByDay}
                  renderDate={renderDate}
                  onEdit={open}
                  onAdd={(day, time) => open(null, day, time)}
                  onComplete={complete}
                  pending={pending}
                  dragTask={dragTask}
                  dragTarget={dragTarget}
                  timeAxis={timeAxis}
                />
              </div>
            </div>
          </section>
        </div>
        <PlannerMobileNavigation
          mobile={mobile}
          sidebarMode={sidebarMode}
          total={displayTotal}
          onShowPlanner={() => setMobile("planner")}
          onCreate={() =>
            open(null, displayedDay, mobile === "planner" ? "09:00" : undefined)
          }
          onSelectSidebar={selectSidebar}
        />
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
        {dragTask &&
          (() => {
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
}
