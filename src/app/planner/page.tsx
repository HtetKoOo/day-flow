import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { plannerRange } from "@/lib/tasks/schedule";
import { PlannerShell } from "@/components/planner/planner-shell";
import type { Routine } from "@/lib/tasks/routines";
import type { TaskIconName } from "@/lib/tasks/icons";
import { routineOccurrencesBetween } from "@/lib/tasks/routines";
type TaskRow = {
  id: string;
  title: string;
  notes: string;
  duration_minutes: number;
  is_completed: boolean;
  is_private?: boolean;
  color?: string;
  icon?: TaskIconName | null;
  scheduled_date?: string | null;
  start_time?: string | null;
};
type PlannerSnapshot = {
  profile: { timezone: string; week_starts_on: number } | null;
  inbox: TaskRow[];
  inbox_count: number;
  inbox_error: boolean;
  scheduled: TaskRow[];
  scheduled_count: number;
  loaded_through?: string;
  scheduled_error: boolean;
};
function toTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    duration_minutes: row.duration_minutes,
    is_completed: row.is_completed,
    is_private: row.is_private ?? false,
    color: row.color ?? "sage",
    icon: row.icon ?? undefined,
    scheduled_date: row.scheduled_date ?? null,
    start_time: row.start_time ?? null,
  };
}
export const dynamic = "force-dynamic";
// Keep authenticated planner reads close to the Supabase project in Singapore.
export const preferredRegion = "sin1";
export default async function Planner({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const requestedDate = z.iso.date().safeParse(params.date);
  const view =
    params.view === "week" || params.view === "two-days" ? params.view : "day";
  const routinesRequest = supabase
    .from("recurring_tasks")
    .select(
      "id,title,notes,start_time,duration_minutes,days_of_week,starts_on,ends_on,is_active,is_private,color,icon",
    )
    .order("start_time");
  const { data, error } = await supabase.rpc("planner_snapshot", {
    p_selected_date: requestedDate.success ? requestedDate.data : null,
    p_view: view,
  });
  let snapshot = data
    ? {
        ...(data as Omit<PlannerSnapshot, "inbox_error" | "scheduled_error">),
        inbox_error: false,
        scheduled_error: false,
      }
    : null;
  let snapshotError = error;
  // Keep the planner available while a deployment is waiting for its database
  // migration to be applied.
  if (error?.code === "PGRST202") {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("timezone,week_starts_on")
      .single();
    if (profile) {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: profile.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const range = plannerRange(
        today,
        requestedDate.success ? requestedDate.data : undefined,
        view,
        profile.week_starts_on,
      );
      const strip = plannerRange(
        today,
        range.day,
        "week",
        profile.week_starts_on,
      );
      const [inboxResult, scheduledResult] = await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact" })
          .is("scheduled_date", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .limit(500),
        supabase
          .from("tasks")
          .select("*", { count: "exact" })
          .gte("scheduled_date", strip.from)
          .lte("scheduled_date", range.to > strip.to ? range.to : strip.to)
          .order("scheduled_date")
          .order("start_time")
          .order("id")
          .limit(1000),
      ]);
      snapshot = {
        profile,
        inbox: (inboxResult.data ?? []) as TaskRow[],
        inbox_count: inboxResult.count ?? 0,
        inbox_error: !!inboxResult.error,
        scheduled: (scheduledResult.data ?? []) as TaskRow[],
        scheduled_count: scheduledResult.count ?? 0,
        loaded_through: range.to > strip.to ? range.to : strip.to,
        scheduled_error: !!scheduledResult.error,
      };
    }
    snapshotError = profileError;
  }
  const profile = snapshot?.profile;
  if (snapshotError || !profile || !snapshot)
    return (
      <main className="p-12">
        <h1 className="text-2xl">Database setup needed</h1>
        <p className="mt-4">
          Apply the DayFlow migration, then reload this page.
        </p>
        <Link href="/settings" className="underline">
          Account settings
        </Link>
      </main>
    );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const range = plannerRange(
    today,
    requestedDate.success ? requestedDate.data : undefined,
    view,
    profile.week_starts_on,
  );
  const strip = plannerRange(today, range.day, "week", profile.week_starts_on);
  const loadedDays =
    snapshot.loaded_through && snapshot.loaded_through > strip.to
      ? [...strip.days, snapshot.loaded_through]
      : strip.days;
  const { data: routines } = await routinesRequest;
  const allRoutines = (routines ?? []) as Routine[];
  const routineBlocks = allRoutines
    .filter((routine) => routine.is_active)
    .flatMap((routine) =>
      routineOccurrencesBetween(
        routine,
        strip.from,
        loadedDays[loadedDays.length - 1],
      ).map((date) => ({
        id: `routine-${routine.id}-${date}`,
        title: routine.title,
        notes: routine.notes,
        duration_minutes: routine.duration_minutes,
        is_completed: false,
        is_private: routine.is_private ?? false,
        is_routine: true,
        routine_id: routine.id,
        color: routine.color ?? "sage",
        icon: routine.icon,
        scheduled_date: date,
        start_time: routine.start_time,
      })),
    );
  return (
    <PlannerShell
      timezone={profile.timezone}
      tasks={snapshot.inbox.map(toTask)}
      inboxError={snapshot.inbox_error}
      total={snapshot.inbox_count}
      scheduled={[
        ...snapshot.scheduled.map((row) => ({
          ...toTask(row),
          scheduled_date: row.scheduled_date as string,
          start_time: row.start_time as string,
        })),
        ...routineBlocks,
      ]}
      scheduleError={snapshot.scheduled_error}
      scheduledCount={snapshot.scheduled_count}
      today={today}
      range={range}
      stripDays={strip.days}
      loadedDays={loadedDays}
      weekStartsOn={profile.week_starts_on}
      routines={allRoutines}
    />
  );
}
