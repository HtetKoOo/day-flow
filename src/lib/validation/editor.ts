import { z } from "zod";
import { taskColors } from "@/lib/tasks/colors";
import { taskIconNames } from "@/lib/tasks/icons";
import { minutes } from "@/lib/tasks/schedule";
export const editorInput = z
  .object({
    title: z.string().trim().min(1, "Give your task a name.").max(200),
    notes: z.string().max(10000).default(""),
    duration_minutes: z.coerce.number().int().min(5).max(1440),
    color: z.enum(taskColors),
    icon: z.enum(taskIconNames).nullable(),
    scheduled_date: z.iso.date().nullable(),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
  })
  .superRefine((task, ctx) => {
    if ((task.scheduled_date === null) !== (task.start_time === null))
      ctx.addIssue({
        code: "custom",
        message: "Choose both a date and a time.",
        path: ["start_time"],
      });
    if (
      task.start_time &&
      minutes(task.start_time) + task.duration_minutes > 1440
    )
      ctx.addIssue({
        code: "custom",
        message:
          "This task goes past midnight. Choose an earlier time or shorter duration.",
        path: ["duration_minutes"],
      });
  });
