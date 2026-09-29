import { format, parseISO, addDays } from "date-fns";
import type { TaskIconName } from "@/lib/tasks/icons";

export type Routine = {
  id: string;
  title: string;
  notes: string;
  start_time: string;
  duration_minutes: number;
  days_of_week: number[];
  starts_on: string;
  ends_on?: string | null;
  is_active: boolean;
  color?: string;
  icon?: TaskIconName;
};

export const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function routineDaysLabel(days: number[]) {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((day) => weekdayLabels[day])
    .join(" · ");
}

export function routineOccurrences(
  routine: Pick<Routine, "days_of_week" | "starts_on">,
  count = 84,
) {
  const start = parseISO(routine.starts_on);
  return Array.from({ length: count }, (_, index) => addDays(start, index))
    .filter((date) => routine.days_of_week.includes(date.getDay()))
    .map((date) => format(date, "yyyy-MM-dd"));
}

export function routineOccurrencesBetween(
  routine: Pick<Routine, "days_of_week" | "starts_on"> & {
    ends_on?: string | null;
  },
  from: string,
  to: string,
) {
  const first = routine.starts_on > from ? routine.starts_on : from;
  const last = routine.ends_on && routine.ends_on < to ? routine.ends_on : to;
  if (first > last) return [];
  const dates: string[] = [];
  for (
    let date = parseISO(first);
    format(date, "yyyy-MM-dd") <= last;
    date = addDays(date, 1)
  ) {
    if (routine.days_of_week.includes(date.getDay()))
      dates.push(format(date, "yyyy-MM-dd"));
  }
  return dates;
}
