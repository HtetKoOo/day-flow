import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Settings,
} from "lucide-react";
import type { PlannerView } from "@/components/planner/use-planner-navigation";
import type { SidebarMode } from "@/components/planner/use-planner-shell-state";
import { dateKey } from "@/lib/tasks/schedule";

export function PlannerHeader({
  displayedDay,
  displayedView,
  today,
  inboxOpen,
  sidebarMode,
  displayTotal,
  routeStillLoading,
  selectSidebar,
  navigate,
  isNavigatingTo,
}: {
  displayedDay: string;
  displayedView: PlannerView;
  today: string;
  inboxOpen: boolean;
  sidebarMode: SidebarMode;
  displayTotal: number;
  routeStillLoading: boolean;
  selectSidebar: (mode: SidebarMode) => void;
  navigate: (day: string, view: PlannerView) => void;
  isNavigatingTo: (day: string, view: PlannerView) => boolean;
}) {
  const previous = dateKey(addDays(parseISO(displayedDay), -7));
  const next = dateKey(addDays(parseISO(displayedDay), 7));
  return (
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
          {displayTotal > 0 && (
            <span className="sidebar-switch-count">{displayTotal}</span>
          )}
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
            aria-busy={isNavigatingTo(previous, displayedView)}
            onClick={() => navigate(previous, displayedView)}
          >
            {isNavigatingTo(previous, displayedView) ? (
              <LoaderCircle className="planner-spinner" size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
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
            aria-busy={isNavigatingTo(next, displayedView)}
            onClick={() => navigate(next, displayedView)}
          >
            {isNavigatingTo(next, displayedView) ? (
              <LoaderCircle className="planner-spinner" size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>
      </div>
      <nav className="view-switch" aria-label="Planner views">
        {(["day", "two-days", "week"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => navigate(displayedDay, view)}
            disabled={routeStillLoading}
            aria-busy={isNavigatingTo(displayedDay, view)}
            aria-current={displayedView === view ? "page" : undefined}
          >
            {view === "two-days"
              ? "2 days"
              : view[0].toUpperCase() + view.slice(1)}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="icon-button" href="/settings" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}
