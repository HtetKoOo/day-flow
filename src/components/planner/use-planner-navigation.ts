"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { addDays, parseISO } from "date-fns";
import { dateKey, plannerRange } from "@/lib/tasks/schedule";

export type PlannerView = "day" | "two-days" | "week";
type Route = { day: string; view: PlannerView };
type PlannerRange = ReturnType<typeof plannerRange>;
type AppRouter = {
  push: (href: string, options?: { scroll?: boolean }) => void;
  refresh: () => void;
  prefetch: (href: string) => void;
};

export function plannerHref(day: string, view: PlannerView = "day") {
  return `/planner?date=${day}${view !== "day" ? `&view=${view}` : ""}`;
}

export function usePlannerNavigation({
  today,
  range,
  loadedDays,
  weekStartsOn,
  router,
}: {
  today: string;
  range: PlannerRange;
  loadedDays: string[];
  weekStartsOn: number;
  router: AppRouter;
}) {
  const [localRoute, setLocalRoute] = useState<Route | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<Route | null>(null);
  const [isTransitioning, startTransition] = useTransition();
  const serverView: PlannerView = range.week
    ? "week"
    : range.twoDays
      ? "two-days"
      : "day";

  const isLoadedPlannerRoute = useCallback(
    (day: string, view: PlannerView) => {
      const routeRange = plannerRange(today, day, view, weekStartsOn);
      // Day view also renders a weekly strip, so it must have that full strip.
      const requiredDays =
        view === "day"
          ? plannerRange(today, day, "week", weekStartsOn).days
          : routeRange.days;
      return requiredDays.every((requiredDay) =>
        loadedDays.includes(requiredDay),
      );
    },
    [loadedDays, today, weekStartsOn],
  );

  const localRange = localRoute
    ? plannerRange(today, localRoute.day, localRoute.view, weekStartsOn)
    : null;
  const canUseLocalRange = Boolean(
    localRange &&
    localRoute &&
    isLoadedPlannerRoute(localRoute.day, localRoute.view),
  );
  const routeStillLoading = Boolean(
    navigationTarget &&
    (navigationTarget.day !== range.day ||
      navigationTarget.view !== serverView),
  );
  const pendingRange =
    routeStillLoading && navigationTarget
      ? plannerRange(
          today,
          navigationTarget.day,
          navigationTarget.view,
          weekStartsOn,
        )
      : null;
  const displayedRange =
    canUseLocalRange && localRange ? localRange : (pendingRange ?? range);
  const displayedView: PlannerView = displayedRange.week
    ? "week"
    : displayedRange.twoDays
      ? "two-days"
      : "day";
  const displayedDay = displayedRange.day;
  const displayedDays = displayedRange.days;
  const isRangeView = displayedRange.week || displayedRange.twoDays;
  const showRoutePending = routeStillLoading && !canUseLocalRange;
  const displayedStripDays = useMemo(
    () => plannerRange(today, displayedDay, "week", weekStartsOn).days,
    [displayedDay, today, weekStartsOn],
  );

  // Planner data is dynamic, but its RSC payload can still be fetched while
  // the user is reading the current range. The arrows move by one week, so
  // warm those two likely destinations (and Today when it differs) before a
  // click. Navigation then uses the Router Cache instead of waiting to begin
  // a new Supabase snapshot request.
  useEffect(() => {
    const destinations = [
      dateKey(addDays(parseISO(displayedDay), -7)),
      dateKey(addDays(parseISO(displayedDay), 7)),
      today,
    ];
    for (const day of new Set(destinations)) {
      if (day !== displayedDay)
        router.prefetch(plannerHref(day, displayedView));
    }
  }, [displayedDay, displayedView, router, today]);

  useEffect(() => {
    const syncHistoryRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const day = params.get("date") ?? today;
      const requestedView = params.get("view");
      const view: PlannerView =
        requestedView === "week" || requestedView === "two-days"
          ? requestedView
          : "day";
      if (!isLoadedPlannerRoute(day, view)) {
        router.refresh();
        return;
      }
      setNavigationTarget(null);
      setLocalRoute({ day, view });
    };
    window.addEventListener("popstate", syncHistoryRoute);
    return () => window.removeEventListener("popstate", syncHistoryRoute);
  }, [isLoadedPlannerRoute, range.day, router, serverView, today]);

  const navigate = useCallback(
    (day: string, view: PlannerView = serverView) => {
      if (routeStillLoading || (day === displayedDay && view === displayedView))
        return;
      if (isLoadedPlannerRoute(day, view)) {
        window.history.pushState(null, "", plannerHref(day, view));
        setNavigationTarget(null);
        setLocalRoute({ day, view });
        return;
      }
      setLocalRoute(null);
      setNavigationTarget({ day, view });
      startTransition(() =>
        router.push(plannerHref(day, view), { scroll: false }),
      );
    },
    [
      displayedDay,
      displayedView,
      isLoadedPlannerRoute,
      routeStillLoading,
      router,
      serverView,
    ],
  );

  const isNavigatingTo = useCallback(
    (day: string, view: PlannerView) =>
      routeStillLoading &&
      navigationTarget?.day === day &&
      navigationTarget.view === view,
    [navigationTarget, routeStillLoading],
  );

  return {
    displayedRange,
    displayedView,
    displayedDay,
    displayedDays,
    displayedStripDays,
    isRangeView,
    isNavigatingTo,
    navigate,
    routeStillLoading: routeStillLoading || isTransitioning,
    showRoutePending,
  };
}
