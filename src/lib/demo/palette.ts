import { taskPickerColors } from "@/lib/tasks/colors";
import { taskIconNames, type TaskIconName } from "@/lib/tasks/icons";

/** A focused, high-contrast set trialled only in the public demo. */
export const demoTaskColors = taskPickerColors;

export const demoTaskIconNames: TaskIconName[] = [...taskIconNames];
