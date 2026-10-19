import { createHash } from "node:crypto";
import { z } from "zod";

export const calendarImportInput = z
  .array(
    z
      .object({
        title: z.string().trim().min(1).max(200),
        notes: z.string().max(10000).default(""),
        source_uid: z.string().min(1).max(1024).optional(),
        recurrence_id: z.string().max(256).optional(),
        scheduled_date: z.iso.date(),
        start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        duration_minutes: z.number().int().min(5).max(1440),
        is_private: z.boolean().default(true),
      })
      .refine((event) => {
        const [hour, minute] = event.start_time.split(":").map(Number);
        return hour * 60 + minute + event.duration_minutes <= 1440;
      }, "An imported event must finish before midnight."),
  )
  .min(1, "Choose at least one event to import.")
  .max(200, "Import up to 200 events at a time.");

export function calendarImportKey(
  event: z.infer<typeof calendarImportInput>[number],
) {
  const identity = event.source_uid
    ? ["uid", event.source_uid, event.recurrence_id ?? ""]
    : [
        "content",
        event.title,
        event.notes,
        event.scheduled_date,
        event.start_time,
        event.duration_minutes,
      ];
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}
