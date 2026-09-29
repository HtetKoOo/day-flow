import { CalendarDays, Inbox, Plus } from "lucide-react";
import type { SidebarMode } from "@/components/planner/use-planner-shell-state";

export function PlannerMobileNavigation({
  mobile,
  sidebarMode,
  total,
  onShowPlanner,
  onCreate,
  onSelectSidebar,
}: {
  mobile: string;
  sidebarMode: SidebarMode;
  total: number;
  onShowPlanner: () => void;
  onCreate: () => void;
  onSelectSidebar: (mode: SidebarMode) => void;
}) {
  return (
    <nav className="mobile-navigation" aria-label="Mobile planner navigation">
      <button aria-pressed={mobile === "planner"} onClick={onShowPlanner}>
        <CalendarDays size={20} />
        Planner
      </button>
      <button
        className="mobile-create"
        aria-label="Add task"
        onClick={onCreate}
      >
        <Plus size={24} />
      </button>
      <button
        aria-pressed={mobile === "inbox" && sidebarMode === "inbox"}
        onClick={() => onSelectSidebar("inbox")}
      >
        <Inbox size={20} />
        Tasks {total > 0 && <span>{total}</span>}
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
