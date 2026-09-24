"use client";
import { useEffect, useRef, type ReactNode } from "react";
// Navigate once after an intentional horizontal gesture, never on vertical scrolling.
export function DateStrip({
  children,
  onMove,
}: {
  children: ReactNode;
  onMove: (direction: number) => void;
}) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const wheel = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <nav
      className="date-strip"
      aria-label="Choose a day"
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
      onTouchStart={(event) => {
        const t = event.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
        suppressClick.current = false;
      }}
      onTouchCancel={() => {
        touch.current = null;
      }}
      onTouchEnd={(event) => {
        if (!touch.current) return;
        const t = event.changedTouches[0];
        const dx = touch.current.x - t.clientX;
        const dy = touch.current.y - t.clientY;
        touch.current = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          suppressClick.current = true;
          onMove(dx > 0 ? 1 : -1);
        }
      }}
      onWheel={(event) => {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        wheel.current += event.deltaX;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          if (Math.abs(wheel.current) > 80) onMove(wheel.current > 0 ? 1 : -1);
          wheel.current = 0;
        }, 180);
      }}
    >
      {children}
    </nav>
  );
}
