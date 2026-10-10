import type { TaskIconName } from "@/lib/tasks/icons";

export type InboxTask = {
  color?: string;
  icon?: TaskIconName;
  scheduled_date?: string | null;
  start_time?: string | null;
  id: string;
  title: string;
  notes: string;
  duration_minutes: number;
  is_completed: boolean;
  is_private?: boolean;
  is_routine?: boolean;
  routine_id?: string;
};
export type TaskResult = { ok: boolean; message: string };
export type ScheduledTask = InboxTask & {
  scheduled_date: string;
  start_time: string;
};
