import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { z } from "zod";
export const scheduleInput = z
  .object({
    id: z.uuid(),
    scheduled_date: z.iso.date().nullable(),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    duration_minutes: z.coerce.number().int().min(5).max(1440),
  })
  .superRefine((task, ctx) => {
    if ((task.scheduled_date === null) !== (task.start_time === null))
      ctx.addIssue({
        code: "custom",
        message: "Set both a date and a start time.",
        path: ["start_time"],
      });
    if (
      task.start_time &&
      minutes(task.start_time) + task.duration_minutes > 1440
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Task must end by midnight. Choose an earlier time or shorter duration.",
        path: ["duration_minutes"],
      });
  });
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function endTime(start: string, duration: number) {
  const end = minutes(start) + duration;
  return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
}
export function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}
export function plannerRange(
  today: string,
  date: unknown,
  view: unknown,
  weekStartsOn: number = 1,
) {
  const selected = z.iso.date().safeParse(date);
  const day = selected.success ? selected.data : today;
  const week = view === "week";
  const twoDays = view === "two-days";
  const first = week
    ? startOfWeek(parseISO(day), {
        weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      })
    : parseISO(day);
  const days = Array.from({ length: week ? 7 : twoDays ? 2 : 1 }, (_, i) =>
    dateKey(addDays(first, i)),
  );
  return { day, week, twoDays, days, from: days[0], to: days[days.length - 1] };
}
