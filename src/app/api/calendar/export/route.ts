import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { buildIcsCalendar, type CalendarExportEvent } from "@/lib/calendar/ics";
import { routineOccurrencesBetween, type Routine } from "@/lib/tasks/routines";

const queryInput = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  private: z.enum(["exclude", "busy", "details"]).default("exclude"),
  notes: z.enum(["0", "1"]).default("0"),
});

export async function GET(request: NextRequest) {
  const parsed = queryInput.safeParse({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
    private: request.nextUrl.searchParams.get("private") ?? "exclude",
    notes: request.nextUrl.searchParams.get("notes") ?? "0",
  });
  if (!parsed.success || parsed.data.from > parsed.data.to)
    return NextResponse.json(
      { message: "Choose a valid export range." },
      { status: 400 },
    );

  const { supabase, user } = await requireUser();
  const [
    { data: profile },
    { data: tasks, error: taskError },
    { data: routines, error: routineError },
  ] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
    supabase
      .from("tasks")
      .select(
        "id,title,notes,scheduled_date,start_time,duration_minutes,is_private",
      )
      .eq("user_id", user.id)
      .gte("scheduled_date", parsed.data.from)
      .lte("scheduled_date", parsed.data.to),
    supabase
      .from("recurring_tasks")
      .select(
        "id,title,notes,start_time,duration_minutes,days_of_week,starts_on,ends_on,is_active,is_private",
      )
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);
  if (taskError || routineError)
    return NextResponse.json(
      { message: "Could not prepare your calendar." },
      { status: 500 },
    );

  const taskEvents: CalendarExportEvent[] = (tasks ?? []).flatMap((task) =>
    task.scheduled_date && task.start_time
      ? [
          {
            id: task.id,
            title: task.title,
            notes: task.notes,
            date: task.scheduled_date,
            startTime: task.start_time.slice(0, 5),
            durationMinutes: task.duration_minutes,
            isPrivate: task.is_private,
          },
        ]
      : [],
  );
  const routineEvents: CalendarExportEvent[] = (
    (routines ?? []) as Routine[]
  ).flatMap((routine) =>
    routineOccurrencesBetween(routine, parsed.data.from, parsed.data.to).map(
      (date) => ({
        id: `routine-${routine.id}-${date}`,
        title: routine.title,
        notes: routine.notes,
        date,
        startTime: routine.start_time.slice(0, 5),
        durationMinutes: routine.duration_minutes,
        isPrivate: routine.is_private ?? false,
      }),
    ),
  );
  const calendar = buildIcsCalendar([...taskEvents, ...routineEvents], {
    timezone: profile?.timezone ?? "UTC",
    privateMode: parsed.data.private,
    includeNotes: parsed.data.notes === "1",
  });
  const filename = `dayflow-${parsed.data.from}-to-${parsed.data.to}.ics`;
  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
