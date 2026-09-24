export const taskColors = [
  "sage",
  "mint",
  "teal",
  "sky",
  "lavender",
  "lilac",
  "rose",
  "peach",
  "amber",
  "stone",
] as const;
export type TaskColor = (typeof taskColors)[number];
export function taskColor(value?: string | null): TaskColor {
  return taskColors.includes(value as TaskColor)
    ? (value as TaskColor)
    : "sage";
}
