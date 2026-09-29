import {
  BookOpen,
  Briefcase,
  CalendarCheck,
  Coffee,
  Dumbbell,
  HeartPulse,
  House,
  Laptop,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Moon,
  ShoppingBag,
  Sunrise,
  type LucideIcon,
} from "lucide-react";

export const taskIconNames = [
  "sunrise",
  "focus",
  "dumbbell",
  "briefcase",
  "calendar-check",
  "book-open",
  "lightbulb",
  "message-circle",
  "coffee",
  "laptop",
  "house",
  "shopping-bag",
  "heart-pulse",
  "moon",
] as const;

export type TaskIconName = (typeof taskIconNames)[number];

const icons: Record<TaskIconName, LucideIcon> = {
  sunrise: Sunrise,
  focus: ListChecks,
  dumbbell: Dumbbell,
  briefcase: Briefcase,
  "calendar-check": CalendarCheck,
  "book-open": BookOpen,
  lightbulb: Lightbulb,
  "message-circle": MessageCircle,
  coffee: Coffee,
  laptop: Laptop,
  house: House,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  moon: Moon,
};

export function taskIcon(name: TaskIconName | undefined) {
  return name ? icons[name] : undefined;
}
