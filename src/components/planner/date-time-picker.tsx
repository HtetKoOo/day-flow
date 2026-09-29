"use client";

import { useState, type WheelEvent } from "react";
import { Popover } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minuteValues = Array.from({ length: 60 }, (_, index) => index);

function scrollColumn(event: WheelEvent<HTMLDivElement>) {
  if (!event.deltaY) return;
  event.currentTarget.scrollTop += event.deltaY;
  event.preventDefault();
  event.stopPropagation();
}

function pickerDate(value: string) {
  return parseISO(value);
}

export function DatePicker({
  name,
  defaultValue,
  min,
  label,
}: {
  name: string;
  defaultValue: string;
  min?: string;
  label: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [month, setMonth] = useState(() =>
    startOfMonth(pickerDate(defaultValue)),
  );
  const [open, setOpen] = useState(false);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });
  const minimum = min ? pickerDate(min) : null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <Popover.Trigger asChild>
        <button
          type="button"
          className="date-time-picker-trigger"
          aria-label={label}
        >
          <span>{format(pickerDate(value), "dd/MM/yyyy")}</span>
          <CalendarDays size={19} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="date-picker-popover"
          side="bottom"
          align="start"
          sideOffset={8}
        >
          <div className="date-picker-month">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth((current) => subMonths(current, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <strong>{format(month, "MMMM yyyy")}</strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth((current) => addMonths(current, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="date-picker-weekdays">
            {weekdays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-picker-days">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const disabled = minimum ? isBefore(day, minimum) : false;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  data-outside={!isSameMonth(day, month) || undefined}
                  aria-pressed={isSameDay(day, pickerDate(value))}
                  onClick={() => {
                    setValue(key);
                    setMonth(startOfMonth(day));
                    setOpen(false);
                  }}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function TimePicker({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue: string;
  label: string;
}) {
  const [initialHour, initialMinute] = defaultValue.split(":").map(Number);
  const initialPeriod = initialHour >= 12 ? "PM" : "AM";
  const [hour, setHour] = useState(initialHour % 12 || 12);
  const [minute, setMinute] = useState(initialMinute);
  const [period, setPeriod] = useState<"AM" | "PM">(initialPeriod);
  const [open, setOpen] = useState(false);
  const displayValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
  const savedHour = period === "AM" ? hour % 12 : (hour % 12) + 12;
  const savedValue = `${String(savedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={savedValue} />
      <Popover.Trigger asChild>
        <button
          type="button"
          className="date-time-picker-trigger"
          aria-label={label}
        >
          <span>{displayValue}</span>
          <Clock3 size={19} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="time-picker-popover"
          side="bottom"
          align="start"
          sideOffset={8}
        >
          <div className="time-picker-heading">Choose a time</div>
          <div className="time-picker-columns">
            <div className="time-picker-column" aria-label="Hour">
              <span>Hour</span>
              <div onWheel={scrollColumn}>
                {hours.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value === hour}
                    onClick={() => setHour(value)}
                  >
                    {String(value).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div className="time-picker-column" aria-label="Minute">
              <span>Minute</span>
              <div onWheel={scrollColumn}>
                {minuteValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value === minute}
                    onClick={() => setMinute(value)}
                  >
                    {String(value).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="time-picker-column time-picker-period"
              aria-label="AM or PM"
            >
              <span>Period</span>
              <div onWheel={scrollColumn}>
                {(["AM", "PM"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value === period}
                    onClick={() => setPeriod(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="time-picker-confirm"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
