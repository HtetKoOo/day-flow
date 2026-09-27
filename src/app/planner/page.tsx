import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { plannerRange } from "@/lib/tasks/schedule";
import { PlannerShell } from "@/components/planner/planner-shell";
function toTask(row: {
  id: string;
  title: string;
  notes: string;
  duration_minutes: number;
  is_completed: boolean;
  color?: string;
  scheduled_date?: string | null;
  start_time?: string | null;
}) {
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
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("timezone,week_starts_on")
    .eq("id", user.id)
    .single();
  if (error)
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
    params.date,
    params.view,
    profile.week_starts_on,
  );
  const strip = plannerRange(today, range.day, "week", profile.week_starts_on);
  const [inboxResult, scheduledResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .is("scheduled_date", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(500),
    supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .gte("scheduled_date", strip.from)
      .lte("scheduled_date", range.to > strip.to ? range.to : strip.to)
      .order("scheduled_date")
      .order("start_time")
      .order("id")
      .limit(1000),
  ]);
  const { data: tasks, error: tasksError, count } = inboxResult;
  const {
    data: scheduled,
    error: scheduleError,
    count: scheduledCount,
  } = scheduledResult;
  return (
    <PlannerShell
      timezone={profile.timezone}
      tasks={(tasks ?? []).map(toTask)}
      inboxError={!!tasksError}
      total={count ?? 0}
      scheduled={(scheduled ?? []).map((row) => ({
        ...toTask(row),
        scheduled_date: row.scheduled_date as string,
        start_time: row.start_time as string,
      }))}
      scheduleError={!!scheduleError}
      scheduledCount={scheduledCount ?? 0}
      today={today}
      range={range}
      stripDays={strip.days}
    />
  );
}
