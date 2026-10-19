import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { addDays, parseISO } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Settings,
  ArrowRight,
  ChevronDown,
  CalendarCheck,
} from "lucide-react";
import type { PlannerView } from "@/components/planner/use-planner-navigation";
import type { SidebarMode } from "@/components/planner/use-planner-shell-state";
import { dateKey } from "@/lib/tasks/schedule";
import { PlannerDatePicker } from "@/components/planner/planner-date-picker";
import { CalendarActions } from "@/components/planner/calendar-actions";

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
  calendarFrom,
  calendarTo,
  calendarLabel,
  onCalendarImported,
  showPlanTomorrow,
  weekStartsOn,
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
  calendarFrom: string;
  calendarTo: string;
  calendarLabel: string;
  onCalendarImported: () => void;
  showPlanTomorrow: boolean;
  weekStartsOn: number;
}) {
  const previous = dateKey(addDays(parseISO(displayedDay), -7));
  const next = dateKey(addDays(parseISO(displayedDay), 7));
  const tomorrow = dateKey(addDays(parseISO(today), 1));
  return (
    <header className="app-header" data-inbox-open={inboxOpen}>
      <div className="planner-sidebar-slot">
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
      </div>
      <div className="calendar-navigation">
        <div className="date-navigation">
          <h1><PlannerDatePicker value={displayedDay} today={today} weekStartsOn={weekStartsOn} disabled={routeStillLoading} onSelect={day => navigate(day, displayedView)} /></h1>
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
            aria-label="Go to today"
            onClick={() => navigate(today, displayedView)}
            aria-current={displayedDay === today ? "date" : undefined}
          >
            <span>Today</span><CalendarCheck className="planner-today-icon" size={18} aria-hidden="true" />
          </button>
          {showPlanTomorrow && (
            <Link className="plan-tomorrow-button" href={`/planner?date=${tomorrow}`}>
              Plan tomorrow <ArrowRight size={15} />
            </Link>
          )}
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="planner-view-trigger" aria-label="Choose planner view" disabled={routeStillLoading}>
            {displayedView === "two-days" ? "2 days" : displayedView === "week" ? "Week" : "Day"}<ChevronDown size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="planner-options-menu" align="end" sideOffset={8} collisionPadding={8}>
            <DropdownMenu.RadioGroup value={displayedView} onValueChange={view => navigate(displayedDay, view as PlannerView)}>
              {(["day", "two-days", "week"] as const).map(view => <DropdownMenu.RadioItem key={view} value={view}>
                {view === "two-days" ? "2 days" : view === "week" ? "Week" : "Day"}<DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>)}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <div className="header-actions">
        <CalendarActions
          from={calendarFrom}
          to={calendarTo}
          label={calendarLabel}
          onImported={onCalendarImported}
        />
        <Link className="icon-button" href="/settings" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}
