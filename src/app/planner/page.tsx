import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { plannerRange } from "@/lib/tasks/schedule";
import { PlannerShell } from "@/components/planner/planner-shell";
type TaskRow = {
  id: string;
  title: string;
  notes: string;
  duration_minutes: number;
  is_completed: boolean;
  color?: string;
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
  scheduled_error: boolean;
};
function toTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    duration_minutes: row.duration_minutes,
    is_completed: row.is_completed,
    color: row.color ?? "sage",
    scheduled_date: row.scheduled_date ?? null,
    start_time: row.start_time ?? null,
  };
}
export const dynamic = "force-dynamic";
export default async function Planner({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const requestedDate = z.iso.date().safeParse(params.date);
  const view = params.view === "week" || params.view === "two-days"
    ? params.view
    : "day";
  const { data, error } = await supabase.rpc("planner_snapshot", {
    p_selected_date: requestedDate.success ? requestedDate.data : null,
    p_view: view,
  });
  let snapshot = data
    ? { ...(data as Omit<PlannerSnapshot, "inbox_error" | "scheduled_error">), inbox_error: false, scheduled_error: false }
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
      const strip = plannerRange(today, range.day, "week", profile.week_starts_on);
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
  return (
    <PlannerShell
      timezone={profile.timezone}
      tasks={snapshot.inbox.map(toTask)}
      inboxError={snapshot.inbox_error}
      total={snapshot.inbox_count}
      scheduled={snapshot.scheduled.map((row) => ({
        ...toTask(row),
        scheduled_date: row.scheduled_date as string,
        start_time: row.start_time as string,
      }))}
      scheduleError={snapshot.scheduled_error}
      scheduledCount={snapshot.scheduled_count}
      today={today}
      range={range}
      stripDays={strip.days}
      weekStartsOn={profile.week_starts_on}
    />
  );
}
