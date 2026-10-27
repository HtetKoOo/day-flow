"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { planningDismissalKey } from "@/lib/tasks/tomorrow";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("dayflow-planning-dismissed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("dayflow-planning-dismissed", callback);
  };
}
export function EveningPlanningReminder({
  userId,
  today,
  review,
  onPlan,
}: {
  userId: string;
  today: string;
  review: boolean;
  onPlan: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(planningDismissalKey(userId)) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  if (dismissed || stored === today) return null;
  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(planningDismissalKey(userId), today);
    } catch {
      /* Still dismiss for this visit when storage is blocked. */
    }
    window.dispatchEvent(new Event("dayflow-planning-dismissed"));
  }
  return (
    <aside
      className="evening-planning-reminder"
      aria-label="Tomorrow planning reminder"
    >
      <p>
        {review
          ? "A quiet moment to review tomorrow’s plan."
          : "Take a moment to plan tomorrow."}
      </p>
      <button
        type="button"
        className="evening-planning-action"
        onClick={onPlan}
      >
        {review ? "Review plan" : "Plan tomorrow"}
      </button>
      <button
        type="button"
        className="evening-planning-dismiss"
        onClick={dismiss}
        aria-label="Dismiss planning reminder for tonight on this device"
      >
        <X size={17} />
      </button>
    </aside>
  );
}
