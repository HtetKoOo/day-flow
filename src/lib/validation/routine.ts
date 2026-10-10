import { z } from "zod";
import { minutes } from "@/lib/tasks/schedule";
import { taskColors } from "@/lib/tasks/colors";
import { taskIconNames } from "@/lib/tasks/icons";

export const routineInput = z
  .object({
    title: z.string().trim().min(1, "Give your routine a name.").max(200),
    notes: z.string().max(10000).default(""),
    color: z.enum(taskColors),
    icon: z.enum(taskIconNames).nullable(),
    is_private: z.boolean().default(false),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    duration_minutes: z.coerce.number().int().min(5).max(1440),
    days_of_week: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Choose at least one day."),
    starts_on: z.iso.date(),
    ends_on: z.iso.date().nullable(),
  })
  .superRefine((routine, ctx) => {
    if (minutes(routine.start_time) + routine.duration_minutes > 1440) {
      ctx.addIssue({
        code: "custom",
        message: "This routine goes past midnight.",
        path: ["duration_minutes"],
      });
    }
    if (routine.ends_on && routine.ends_on < routine.starts_on) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be after the start date.",
        path: ["ends_on"],
      });
    }
  });
