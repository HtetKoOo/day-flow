"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { inboxInput, taskId, completionInput } from "@/lib/validation/inbox";
import { z } from "zod";
import { calendarImportInput, calendarImportKey } from "@/lib/calendar/import";
import type { TaskResult } from "@/lib/tasks/types";

export async function saveInboxTask(
  id: string | null,
  input: unknown,
): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const parsed = inboxInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  if (id !== null && !taskId.safeParse(id).success)
    return { ok: false, message: "Invalid task." };
  // Whitelisted fields only: ownership and schedule never come from the browser.
  const query =
    id === null
      ? supabase.from("tasks").insert({
          ...parsed.data,
          user_id: user.id,
          scheduled_date: null,
          start_time: null,
        })
      : supabase
          .from("tasks")
          .update(parsed.data)
          .eq("id", id)
          .eq("user_id", user.id)
          .is("scheduled_date", null);
  const { data, error } = await query.select("id").single();
  if (error || !data)
    return {
      ok: false,
      message: "Could not save this task. Refresh and try again.",
    };
  revalidatePath("/planner");
  return { ok: true, message: id ? "Task updated." : "Task added to Inbox." };
}

export async function completeTask(input: unknown): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const parsed = completionInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid task." };
  const { id, completed } = parsed.data;
  const { data, error } = await supabase
    .from("tasks")
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      ok: false,
      message: "Could not update this task. Refresh and try again.",
    };
  revalidatePath("/planner");
  return {
    ok: true,
    message: completed ? "Task completed." : "Task reopened.",
  };
}

export async function deleteTask(id: string): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  if (!taskId.safeParse(id).success)
    return { ok: false, message: "Invalid task." };
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      ok: false,
      message: "Could not delete this task. Refresh and try again.",
    };
  revalidatePath("/planner");
  return { ok: true, message: "Task deleted." };
}

export async function scheduleTask(input: unknown): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const { scheduleInput } = await import("@/lib/tasks/schedule");
  const parsed = scheduleInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  const { id, ...values } = parsed.data;
  const { data, error } = await supabase
    .from("tasks")
    .update(values)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      ok: false,
      message: "Could not change this schedule. Refresh and try again.",
    };
  revalidatePath("/planner");
  return {
    ok: true,
    message: values.scheduled_date ? "Schedule saved." : "Task moved to Inbox.",
  };
}

export async function createRoutine(input: unknown): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const { routineInput } = await import("@/lib/validation/routine");
  const parsed = routineInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  const routine = parsed.data;
  const { data: created, error } = await supabase
    .from("recurring_tasks")
    .insert({
      user_id: user.id,
      title: routine.title,
      notes: routine.notes,
      color: routine.color,
      icon: routine.icon,
      is_private: routine.is_private,
      reminder_minutes: routine.reminder_minutes,
      start_time: routine.start_time,
      duration_minutes: routine.duration_minutes,
      frequency: "weekly",
      interval: 1,
      days_of_week: routine.days_of_week,
      starts_on: routine.starts_on,
      ends_on: routine.ends_on,
    })
    .select("id")
    .single();
  if (error || !created)
    return {
      ok: false,
      message: "Couldn’t save this routine. Please try again.",
    };

  revalidatePath("/planner");
  return { ok: true, message: "Weekly routine added." };
}

export async function updateRoutine(
  id: string,
  input: unknown,
): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const { routineInput } = await import("@/lib/validation/routine");
  if (!taskId.safeParse(id).success)
    return { ok: false, message: "Invalid routine." };
  const parsed = routineInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  const routine = parsed.data;
  const { data, error } = await supabase
    .from("recurring_tasks")
    .update({
      title: routine.title,
      notes: routine.notes,
      color: routine.color,
      icon: routine.icon,
      is_private: routine.is_private,
      reminder_minutes: routine.reminder_minutes,
      start_time: routine.start_time,
      duration_minutes: routine.duration_minutes,
      days_of_week: routine.days_of_week,
      starts_on: routine.starts_on,
      ends_on: routine.ends_on,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      ok: false,
      message: "Couldn’t update this routine. Please try again.",
    };

  revalidatePath("/planner");
  return { ok: true, message: "Routine updated." };
}

export async function setRoutineActive(
  id: string,
  isActive: boolean,
): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  if (!taskId.safeParse(id).success)
    return { ok: false, message: "Invalid routine." };
  const { data, error } = await supabase
    .from("recurring_tasks")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      ok: false,
      message: "Couldn’t update this routine. Please try again.",
    };
  revalidatePath("/planner");
  return {
    ok: true,
    message: isActive ? "Routine resumed." : "Routine paused.",
  };
}

export async function deleteRoutine(id: string): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  if (!taskId.safeParse(id).success)
    return { ok: false, message: "Invalid routine." };
  const { data, error } = await supabase
    .from("recurring_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error || !data)
    return {
      ok: false,
      message: "Couldn’t delete this routine. Please try again.",
    };
  revalidatePath("/planner");
  return { ok: true, message: "Routine deleted." };
}

export async function saveTask(
  id: string | null,
  input: unknown,
): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const { editorInput } = await import("@/lib/validation/editor");
  const parsed = editorInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  if (id !== null && !taskId.safeParse(id).success)
    return { ok: false, message: "Invalid task." };
  const query =
    id === null
      ? supabase.from("tasks").insert({ ...parsed.data, user_id: user.id })
      : supabase
          .from("tasks")
          .update(parsed.data)
          .eq("id", id)
          .eq("user_id", user.id);
  const { data, error } = await query.select("id").single();
  if (error?.code === "PGRST204" || error?.code === "42703")
    return {
      ok: false,
      message:
        "Task settings need the latest database update. Apply the pending Supabase migrations, then retry.",
    };
  if (error || !data)
    return {
      ok: false,
      message: "Could not save your task. Please try again.",
    };
  revalidatePath("/planner");
  return { ok: true, message: id ? "Changes saved." : "Task added." };
}

export async function importCalendarTasks(input: unknown): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const parsed = calendarImportInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  const rows = parsed.data.map(
    ({ source_uid: _uid, recurrence_id: _recurrence, ...event }) => ({
      ...event,
      user_id: user.id,
      calendar_import_key: calendarImportKey({
        ...event,
        source_uid: _uid,
        recurrence_id: _recurrence,
      }),
      color: "sky",
      icon: "calendar-check",
    }),
  );
  const unique = [
    ...new Map(rows.map((row) => [row.calendar_import_key, row])).values(),
  ];
  const { data: inserted, error } = await supabase
    .from("tasks")
    .upsert(unique, {
      onConflict: "user_id,calendar_import_key",
      ignoreDuplicates: true,
    })
    .select("id");
  if (["PGRST204", "42703", "42P10"].includes(error?.code ?? ""))
    return {
      ok: false,
      message:
        "Calendar import needs the latest database update. Apply the pending Supabase migrations, then retry.",
    };
  if (error)
    return { ok: false, message: "Could not import those events. Try again." };
  revalidatePath("/planner");
  return {
    ok: true,
    message: `${inserted?.length ?? 0} imported. ${parsed.data.length - (inserted?.length ?? 0)} already imported or duplicate events skipped.`,
  };
}

const shareRangeInput = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
});

export async function createTimetableShare(
  input: unknown,
): Promise<TaskResult & { token?: string }> {
  const { supabase, user } = await requireUser();
  const parsed = shareRangeInput.safeParse(input);
  if (!parsed.success || parsed.data.from > parsed.data.to)
    return { ok: false, message: "Choose a valid timetable range." };
  const { data, error } = await supabase
    .from("timetable_shares")
    .upsert(
      {
        owner_id: user.id,
        starts_on: parsed.data.from,
        ends_on: parsed.data.to,
      },
      { onConflict: "owner_id,starts_on,ends_on" },
    )
    .select("token")
    .single();
  if (error?.code === "PGRST204" || error?.code === "42P01")
    return {
      ok: false,
      message:
        "Sharing needs the latest database update. Apply the pending Supabase migrations, then retry.",
    };
  if (error || !data)
    return { ok: false, message: "Could not create a share link. Try again." };
  return { ok: true, message: "Share link ready.", token: data.token };
}

export async function revokeTimetableShare(token: string): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  if (!taskId.safeParse(token).success)
    return { ok: false, message: "Invalid share link." };
  const { error } = await supabase
    .from("timetable_shares")
    .delete()
    .eq("token", token)
    .eq("owner_id", user.id);
  if (error)
    return { ok: false, message: "Could not stop sharing. Try again." };
  return { ok: true, message: "Share link stopped." };
}

export async function saveRoutineOccurrence(
  id: string,
  input: unknown,
): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const { routineOccurrenceInput } =
    await import("@/lib/validation/routine-occurrence");
  const { isRoutineDate } =
    await import("../../../supabase/functions/_shared/routine-occurrences");
  if (!taskId.safeParse(id).success)
    return { ok: false, message: "Invalid routine." };
  const parsed = routineOccurrenceInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  const value = parsed.data;
  const { data: routine, error: routineError } = await supabase
    .from("recurring_tasks")
    .select("id,days_of_week,starts_on,ends_on")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (routineError || !routine)
    return { ok: false, message: "Could not find this routine." };
  // Reset is allowed for old exceptions even after the weekly rule was changed.
  if (value.mode !== "reset" && !isRoutineDate(routine, value.occurrence_date))
    return {
      ok: false,
      message: "This date does not belong to the routine's schedule.",
    };
  const query =
    value.mode === "reset"
      ? supabase
          .from("routine_exceptions")
          .delete()
          .eq("user_id", user.id)
          .eq("recurring_task_id", id)
          .eq("occurrence_date", value.occurrence_date)
      : supabase.from("routine_exceptions").upsert(
          {
            user_id: user.id,
            recurring_task_id: id,
            occurrence_date: value.occurrence_date,
            scheduled_date:
              value.mode === "change" ? value.scheduled_date : null,
            start_time: value.mode === "change" ? value.start_time : null,
            duration_minutes:
              value.mode === "change" ? value.duration_minutes : null,
            is_skipped: value.mode === "skip",
          },
          { onConflict: "user_id,recurring_task_id,occurrence_date" },
        );
  const { error } = await query;
  if (error)
    return {
      ok: false,
      message:
        "Could not save this day. Check that the latest database migration is applied.",
    };
  revalidatePath("/planner");
  revalidatePath("/share", "layout");
  return {
    ok: true,
    message:
      value.mode === "reset"
        ? "Original schedule restored."
        : value.mode === "skip"
          ? "This occurrence skipped."
          : "Only this occurrence updated.",
  };
}
