"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { inboxInput, taskId, completionInput } from "@/lib/validation/inbox";
import { z } from "zod";
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

const calendarImportInput = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(200),
      notes: z.string().max(10000).default(""),
      scheduled_date: z.iso.date(),
      start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      duration_minutes: z.number().int().min(5).max(1440),
    }),
  )
  .min(1, "Choose at least one event to import.")
  .max(200, "Import up to 200 events at a time.");

export async function importCalendarTasks(input: unknown): Promise<TaskResult> {
  const { supabase, user } = await requireUser();
  const parsed = calendarImportInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  const { error } = await supabase.from("tasks").insert(
    parsed.data.map((event) => ({
      ...event,
      user_id: user.id,
      color: "sky",
      icon: "calendar-check",
      is_private: false,
    })),
  );
  if (error?.code === "PGRST204" || error?.code === "42703")
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
    message: `${parsed.data.length} calendar ${parsed.data.length === 1 ? "event" : "events"} imported.`,
  };
}

const shareRangeInput = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
});

export async function createTimetableShare(input: unknown): Promise<
  TaskResult & { token?: string }
> {
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
  if (error) return { ok: false, message: "Could not stop sharing. Try again." };
  return { ok: true, message: "Share link stopped." };
}
