import { addDays, parseISO, subDays } from "date-fns";
import { routineOccurrencesBetween, type Routine } from "@/lib/tasks/routines";
import { dateKey } from "@/lib/tasks/schedule";
import type { TaskIconName } from "@/lib/tasks/icons";
import type { InboxTask, ScheduledTask } from "@/lib/tasks/types";

export const demoInboxTasks: InboxTask[] = [
  {
    id: "demo-inbox-research",
    title: "Research next feature",
    notes: "Collect a few ideas before planning the next week.",
    duration_minutes: 30,
    color: "lavender",
    icon: "lightbulb",
    is_completed: false,
  },
  {
    id: "demo-inbox-message",
    title: "Reply to messages",
    notes: "",
    duration_minutes: 15,
    color: "sky",
    icon: "message-circle",
    is_completed: false,
  },
];

export type DemoRoutine = Routine & {
  color: string;
  icon: TaskIconName;
};

export function demoRoutines(today: string): DemoRoutine[] {
  const startsOn = dateKey(subDays(parseISO(today), 366));
  return [
    {
      id: "demo-routine-morning",
      title: "Morning planning",
      notes: "Review the day before beginning focused work.",
      start_time: "08:30",
      duration_minutes: 30,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      starts_on: startsOn,
      is_active: true,
      color: "sage",
      icon: "sunrise",
    },
    {
      id: "demo-routine-focus",
      title: "Deep work",
      notes: "Protect a distraction-free block for the important work.",
      start_time: "09:00",
      duration_minutes: 120,
      days_of_week: [1, 2, 3, 4, 5],
      starts_on: startsOn,
      is_active: true,
      color: "sky",
      icon: "focus",
    },
    {
      id: "demo-routine-gym",
      title: "Gym",
      notes: "Strength and mobility session.",
      start_time: "17:30",
      duration_minutes: 90,
      days_of_week: [2, 4, 6],
      starts_on: startsOn,
      is_active: true,
      color: "teal",
      icon: "dumbbell",
    },
    {
      id: "demo-routine-reflect",
      title: "Read & reflect",
      notes: "Close the day with a short review.",
      start_time: "20:30",
      duration_minutes: 30,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      starts_on: startsOn,
      is_active: true,
      color: "sage",
      icon: "book-open",
    },
  ];
}

function demoRoutineIcon(id: string): TaskIconName {
  if (id === "demo-routine-morning") return "sunrise";
  if (id === "demo-routine-focus") return "focus";
  if (id === "demo-routine-gym") return "dumbbell";
  return "book-open";
}

export function demoScheduledTasks(
  today: string,
  days: string[],
  routines = demoRoutines(today),
): ScheduledTask[] {
  const from = days[0];
  const to = days[days.length - 1];
  const routineTasks = routines.flatMap((routine) =>
    routineOccurrencesBetween(routine, from, to).map((scheduledDate) => ({
      id: `demo-routine-${routine.id}-${scheduledDate}`,
      title: routine.title,
      notes: routine.notes,
      duration_minutes: routine.duration_minutes,
      color: routine.color,
      icon: routine.icon ?? demoRoutineIcon(routine.id),
      is_completed: false,
      is_routine: true,
      routine_id: routine.id,
      scheduled_date: scheduledDate,
      start_time: routine.start_time,
    })),
  );
  const oneOff: ScheduledTask[] = [
    {
      id: "demo-task-portfolio",
      title: "Review portfolio",
      notes: "Capture the strongest project details.",
      duration_minutes: 60,
      color: "lavender",
      icon: "briefcase",
      is_completed: false,
      scheduled_date: today,
      start_time: "13:30",
    },
    {
      id: "demo-task-plan",
      title: "Plan tomorrow",
      notes: "Choose the three most important tasks.",
      duration_minutes: 15,
      color: "amber",
      icon: "calendar-check",
      is_completed: false,
      scheduled_date: dateKey(addDays(parseISO(today), 1)),
      start_time: "20:00",
    },
    {
      id: "demo-task-love-call",
      title: "Video call with love",
      notes: "A little time together before the evening winds down.",
      duration_minutes: 30,
      color: "rose",
      icon: "heart",
      is_completed: false,
      scheduled_date: today,
      start_time: "19:30",
    },
    {
      id: "demo-task-share",
      title: "Share project update",
      notes: "",
      duration_minutes: 30,
      color: "peach",
      icon: "briefcase",
      is_completed: false,
      scheduled_date: dateKey(addDays(parseISO(today), 2)),
      start_time: "14:00",
    },
  ];
  return [...routineTasks, ...oneOff].filter(
    (task) => task.scheduled_date >= from && task.scheduled_date <= to,
  );
}
