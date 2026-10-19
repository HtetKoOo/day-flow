export type RoutineException = {
  recurring_task_id: string;
  occurrence_date: string;
  scheduled_date: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  is_skipped: boolean;
};
export type RoutineRule = {
  id: string;
  days_of_week: number[];
  starts_on: string;
  ends_on?: string | null;
  is_active?: boolean;
  start_time: string;
  duration_minutes: number;
};
export function isRoutineDate(
  rule: Pick<RoutineRule, "days_of_week" | "starts_on" | "ends_on">,
  date: string,
) {
  return (
    date >= rule.starts_on &&
    (!rule.ends_on || date <= rule.ends_on) &&
    rule.days_of_week.includes(new Date(`${date}T00:00:00Z`).getUTCDay())
  );
}
export function expandRoutine(
  rule: RoutineRule,
  from: string,
  to: string,
  exceptions: RoutineException[] = [],
) {
  if (rule.is_active === false || from > to) return [];
  const overrides = new Map(
    exceptions
      .filter((item) => item.recurring_task_id === rule.id)
      .map((item) => [item.occurrence_date, item]),
  );
  const originals = new Set<string>();
  for (
    let instant = Date.parse(`${from}T00:00:00Z`);
    instant <= Date.parse(`${to}T00:00:00Z`);
    instant += 86400000
  )
    originals.add(new Date(instant).toISOString().slice(0, 10));
  // Include a moved occurrence even if its original date is outside the range.
  for (const item of overrides.values())
    if (
      item.scheduled_date &&
      item.scheduled_date >= from &&
      item.scheduled_date <= to
    )
      originals.add(item.occurrence_date);
  return [...originals].sort().flatMap((original) => {
    if (!isRoutineDate(rule, original)) return [];
    const override = overrides.get(original);
    if (override?.is_skipped) return [];
    const date = override?.scheduled_date ?? original;
    const time = override?.start_time ?? rule.start_time;
    const duration = override?.duration_minutes ?? rule.duration_minutes;
    const [hour, minute] = time.split(":").map(Number);
    if (date < from || date > to || hour * 60 + minute + duration > 1440)
      return [];
    return [
      {
        occurrence_date: original,
        scheduled_date: date,
        start_time: time,
        duration_minutes: duration,
        is_exception: Boolean(override),
      },
    ];
  });
}
