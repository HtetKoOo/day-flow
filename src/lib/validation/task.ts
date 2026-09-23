import { z } from "zod";
export const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().max(10000).default(""),
    scheduled_date: z.iso.date().nullable(),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    duration_minutes: z.number().int().min(5).max(1440),
    category_id: z.uuid().nullable(),
  })
  .superRefine((task, ctx) => {
    if ((task.scheduled_date === null) !== (task.start_time === null))
      ctx.addIssue({
        code: "custom",
        message: "Date and time must both be set, or both empty.",
        path: ["start_time"],
      });
    if (task.start_time) {
      const [h, m] = task.start_time.split(":").map(Number);
      if (h * 60 + m + task.duration_minutes > 1440)
        ctx.addIssue({
          code: "custom",
          message: "Task must end by midnight.",
          path: ["duration_minutes"],
        });
    }
  });
export type TaskInput = z.infer<typeof taskSchema>;
