"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Portal } from "radix-ui";
import styles from "./planner-toast.module.css";
import type { TaskResult } from "@/lib/tasks/types";

export function PlannerToast({ notice, pending, onUndo, onDismiss }: {
  notice: TaskResult;
  pending: boolean;
  onUndo?: () => void;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!notice.ok || pending || hovered || focused) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [notice, pending, hovered, focused, onDismiss]);

  return <Portal.Root><div className={styles.toast} data-error={!notice.ok}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <span role={notice.ok ? "status" : "alert"}>{notice.message}</span>
    {onUndo && <button className="text-button" disabled={pending} onClick={onUndo}>Undo</button>}
    <button className="icon-button" aria-label="Dismiss notification" onClick={onDismiss}><X size={16} /></button>
  </div></Portal.Root>;
}
