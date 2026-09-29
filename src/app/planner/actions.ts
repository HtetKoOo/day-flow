"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { inboxInput, taskId, completionInput } from "@/lib/validation/inbox";
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
        "Task colors need the latest database update. Apply the task_colors migration in Supabase, then retry.",
    };
  if (error || !data)
    return {
      ok: false,
      message: "Could not save your task. Please try again.",
    };
  revalidatePath("/planner");
  return { ok: true, message: id ? "Changes saved." : "Task added." };
}
