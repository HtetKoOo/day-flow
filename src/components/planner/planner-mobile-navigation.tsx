import { CalendarDays, Inbox } from "lucide-react";
import type { SidebarMode } from "@/components/planner/use-planner-shell-state";

export function PlannerMobileNavigation({
  mobile,
  sidebarMode,
  total,
  onShowPlanner,
  onSelectSidebar,
}: {
  mobile: string;
  sidebarMode: SidebarMode;
  total: number;
  onShowPlanner: () => void;
  onSelectSidebar: (mode: SidebarMode) => void;
}) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile planner navigation">
      <button aria-pressed={mobile === "planner"} onClick={onShowPlanner}>
        <CalendarDays size={20} />
        Planner
      </button>
      <button
        aria-pressed={mobile === "inbox" && sidebarMode === "inbox"}
        onClick={() => onSelectSidebar("inbox")}
        aria-label={total > 0 ? `Tasks, ${total} in Inbox` : "Tasks"}
      >
        <span className="mobile-task-icon">
          <Inbox size={20} />
          {total > 0 && (
            <span className="mobile-task-count" aria-hidden="true">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </span>
        Tasks
      </button>
      <button
        aria-pressed={mobile === "inbox" && sidebarMode === "routines"}
        onClick={() => onSelectSidebar("routines")}
      >
        <CalendarDays size={20} />
        Routines
      </button>
    </nav>
  );
}
