import { z } from "zod";
export const routineOccurrenceInput = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("reset"), occurrence_date: z.iso.date() }),
    z.object({ mode: z.literal("skip"), occurrence_date: z.iso.date() }),
    z.object({
      mode: z.literal("change"),
      occurrence_date: z.iso.date(),
      scheduled_date: z.iso.date(),
      start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      duration_minutes: z.number().int().min(5).max(1440),
    }),
  ])
  .refine((value) => {
    if (value.mode !== "change") return true;
    const [hour, minute] = value.start_time.split(":").map(Number);
    return hour * 60 + minute + value.duration_minutes <= 1440;
  }, "This occurrence must finish before midnight.");
