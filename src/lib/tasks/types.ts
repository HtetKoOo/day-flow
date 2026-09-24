export type InboxTask = {
  color?: string;
  scheduled_date?: string | null;
  start_time?: string | null;
  id: string;
  title: string;
  notes: string;
  duration_minutes: number;
  is_completed: boolean;
};
export type TaskResult = { ok: boolean; message: string };
export type ScheduledTask = InboxTask & {
  scheduled_date: string;
  start_time: string;
};
