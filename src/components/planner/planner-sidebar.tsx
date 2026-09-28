import { InboxDropZone } from "@/components/planner/drag-schedule";
import { InboxPanel } from "@/components/planner/inbox-panel";
import { RoutinePanel } from "@/components/planner/routine-panel";
import type { SidebarMode } from "@/components/planner/use-planner-shell-state";
import type { InboxTask } from "@/lib/tasks/types";
import type { Routine } from "@/lib/tasks/routines";

export function PlannerSidebar({
  mobile,
  isMobile,
  inboxOpen,
  sidebarMode,
  tasks,
  total,
  loadError,
  pending,
  routines,
  onComplete,
  onEditTask,
  onRetry,
  onAddRoutine,
  onEditRoutine,
}: {
  mobile: string;
  isMobile: boolean;
  inboxOpen: boolean;
  sidebarMode: SidebarMode;
  tasks: InboxTask[];
  total: number;
  loadError: boolean;
  pending: boolean;
  routines: Routine[];
  onComplete: (task: InboxTask) => void;
  onEditTask: (task: InboxTask) => void;
  onRetry: () => void;
  onAddRoutine: () => void;
  onEditRoutine: (routine: Routine) => void;
}) {
  return (
    <aside
      id="planner-inbox"
      className="inbox-sidebar"
      inert={isMobile ? mobile !== "inbox" : !inboxOpen}
    >
      <InboxDropZone className="inbox-content">
        {sidebarMode === "inbox" ? (
          <InboxPanel
            tasks={tasks}
            total={total}
            loadError={loadError}
            pending={pending}
            onComplete={onComplete}
            onEdit={onEditTask}
            onRetry={onRetry}
          />
        ) : (
          <RoutinePanel
            routines={routines}
            onAdd={onAddRoutine}
            onEdit={onEditRoutine}
          />
        )}
      </InboxDropZone>
    </aside>
  );
}
