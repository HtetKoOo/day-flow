import { z } from "zod";
export const inboxInput = z.object({
  title: z.string().trim().min(1, "Enter a task title.").max(200),
  notes: z.string().max(10000),
  duration_minutes: z.coerce.number().int().min(5).max(1440),
});
export const taskId = z.uuid();
export const completionInput = z.object({ id: taskId, completed: z.boolean() });
