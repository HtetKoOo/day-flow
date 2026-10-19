"use client";

import { useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Dialog, Popover } from "radix-ui";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";

function subscribeMobile(callback: () => void) {
  const query = window.matchMedia("(max-width: 760px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const readMobile = () => window.matchMedia("(max-width: 760px)").matches;
const serverMobile = () => false;

export function PlannerDatePicker({ value, today, weekStartsOn, disabled, onSelect }: {
  value: string;
  today: string;
  weekStartsOn: number;
  disabled: boolean;
  onSelect: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(parseISO(value)));
  const mobile = useSyncExternalStore(subscribeMobile, readMobile, serverMobile);
  const firstDay = weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: firstDay }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: firstDay }),
  });

  function changeOpen(next: boolean) {
    if (next) setMonth(startOfMonth(parseISO(value)));
    setOpen(next);
  }
  function select(day: string) {
    setOpen(false);
    onSelect(day);
  }
  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, day: Date) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    const next = format(addDays(day, offset), "yyyy-MM-dd");
    const target = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`);
    if (target) { event.preventDefault(); target.focus(); }
  }

  const trigger = <button type="button" className="planner-month-trigger" disabled={disabled} aria-label={`Choose date, ${format(parseISO(value), "MMMM yyyy")}`}>
    {format(parseISO(value), "MMM yyyy")}<ChevronDown size={15} aria-hidden="true" />
  </button>;
  const calendar = <>
    <div className="planner-picker-controls">
      <button type="button" className="icon-button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={18} /></button>
      <label className="sr-only" htmlFor="planner-picker-month">Month</label>
      <select id="planner-picker-month" aria-label="Month" value={month.getMonth()} onChange={e => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))}>
        {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{format(new Date(2026, i, 1), "MMMM")}</option>)}
      </select>
      <label className="sr-only" htmlFor="planner-picker-year">Year</label>
      <input id="planner-picker-year" aria-label="Year" type="number" min={1900} max={2100} value={month.getFullYear()} onChange={e => {
        const year = Number(e.target.value);
        if (year >= 1900 && year <= 2100) setMonth(new Date(year, month.getMonth(), 1));
      }} />
      <button type="button" className="icon-button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} /></button>
    </div>
    <div className="planner-picker-weekdays" aria-hidden="true">
      {days.slice(0, 7).map(day => <span key={format(day, "EEE")}>{format(day, "EEEEE")}</span>)}
    </div>
    <div className="planner-picker-days" role="group" aria-label={format(month, "MMMM yyyy")}>
      {days.map(day => {
        const key = format(day, "yyyy-MM-dd");
        return <button key={key} type="button" data-date={key} data-outside={day.getMonth() !== month.getMonth() || undefined} aria-label={format(day, "EEEE, MMMM d, yyyy")} aria-pressed={key === value} aria-current={key === today ? "date" : undefined} onKeyDown={e => moveFocus(e, day)} onClick={() => select(key)}>{format(day, "d")}</button>;
      })}
    </div>
    <button type="button" className="planner-picker-today" onClick={() => select(today)}>Go to today</button>
  </>;

  if (mobile) return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="planner-picker-overlay" />
      <Dialog.Content className="planner-date-sheet">
        <div className="planner-picker-heading"><Dialog.Title>Choose a date</Dialog.Title><Dialog.Close asChild><button type="button" className="icon-button" aria-label="Close calendar"><X size={18} /></button></Dialog.Close></div>
        <Dialog.Description className="sr-only">Choose a day to view in your planner.</Dialog.Description>
        {calendar}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;

  return <Popover.Root open={open} onOpenChange={changeOpen}>
    <Popover.Trigger asChild>{trigger}</Popover.Trigger>
    <Popover.Portal><Popover.Content className="planner-date-popover" side="bottom" align="start" sideOffset={10} collisionPadding={12} aria-label="Choose a date">{calendar}</Popover.Content></Popover.Portal>
  </Popover.Root>;
}
