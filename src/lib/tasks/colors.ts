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

export const taskPickerColors = [
  "sage",
  "teal",
  "sky",
  "lavender",
  "rose",
  "peach",
  "amber",
  "stone",
] as const satisfies readonly TaskColor[];
export function taskColor(value?: string | null): TaskColor {
  return taskColors.includes(value as TaskColor)
    ? (value as TaskColor)
    : "sage";
}

/** Keeps a legacy color visible while moving new choices to the approved palette. */
export function taskPickerColorOptions(current?: string | null): TaskColor[] {
  const color = taskColor(current);
  return taskPickerColors.includes(color as (typeof taskPickerColors)[number])
    ? [...taskPickerColors]
    : [...taskPickerColors, color];
}
