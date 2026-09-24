"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
const subscribe = () => () => {};
export function ThemePicker() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-picker" role="group" aria-label="Appearance">
      {[
        { id: "light", Icon: Sun },
        { id: "dark", Icon: Moon },
        { id: "system", Icon: Monitor },
      ].map(({ id, Icon }) => (
        <button
          key={id}
          type="button"
          disabled={!mounted}
          aria-pressed={mounted && theme === id}
          onClick={() => setTheme(id)}
        >
          <Icon size={17} />
          <span>{id[0].toUpperCase() + id.slice(1)}</span>
        </button>
      ))}
    </div>
  );
}
