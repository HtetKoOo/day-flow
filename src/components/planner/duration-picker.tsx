import { Clock3, Minus, Plus, type LucideIcon } from "lucide-react";

export const durationPresets = [15, 30, 60, 90, 120, 180];

export function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function DurationPicker({
  duration,
  onChange,
  Icon = Clock3,
}: {
  duration: number;
  onChange: (duration: number) => void;
  Icon?: LucideIcon;
}) {
  return (
    <div className="duration-editor" role="group" aria-label="Task duration">
      <span className="duration-heading">
        <Icon size={16} /> Duration
      </span>
      <div className="duration-presets" aria-label="Quick durations">
        {durationPresets.map((minutes) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={duration === minutes}
            onClick={() => onChange(minutes)}
          >
            {durationLabel(minutes)}
          </button>
        ))}
      </div>
      <div className="duration-stepper">
        <span>Custom</span>
        <div>
          <button
            type="button"
            aria-label="Reduce duration by 15 minutes"
            onClick={() => onChange(Math.max(5, duration - 15))}
          >
            <Minus size={16} />
          </button>
          <output aria-live="polite">{durationLabel(duration)}</output>
          <button
            type="button"
            aria-label="Increase duration by 15 minutes"
            onClick={() => onChange(Math.min(1440, duration + 15))}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
