"use client";
import { useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ArrowLeft, ArrowRight, Settings, Moon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PlannerShell({ timezone }: { timezone: string }) {
  const [today] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [offset, setOffset] = useState(1);
  const [week, setWeek] = useState(false);
  const date = addDays(parseISO(today), offset);
  const days = week
    ? Array.from({ length: 7 }, (_, i) =>
        addDays(startOfWeek(date, { weekStartsOn: 1 }), i),
      )
    : [date];
  return (
    <main className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b px-6 py-5 lg:px-10">
        <Link href="/planner" className="text-xl font-semibold">
          ✦ DayFlow
        </Link>
        <nav aria-label="Planner views" className="flex gap-2">
          {["Today", "Tomorrow", "Week"].map((label, i) => (
            <Button
              key={label}
              variant={
                (i === 2 ? week : !week && offset === i) ? "default" : "ghost"
              }
              onClick={() => {
                setWeek(i === 2);
                if (i < 2) setOffset(i);
              }}
            >
              {label}
            </Button>
          ))}
        </nav>
        <Link href="/settings" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </header>
      <div className="grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b p-6 lg:min-h-[85vh] lg:border-r">
          <p className="eyebrow flex items-center gap-2">
            <Inbox size={16} /> Inbox
          </p>
          <p className="mt-8 text-sm text-muted-foreground">
            A home for ideas before they have a time.
          </p>
          <p className="mt-5 rounded-xl border border-dashed p-4 text-sm">
            Task creation will arrive in the next implementation phase.
          </p>
        </aside>
        <section className="min-w-0 p-6 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">
                {week
                  ? "YOUR WEEK"
                  : offset === 1
                    ? "MAKE ROOM FOR TOMORROW"
                    : "ONE DAY AT A TIME"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold">
                {format(date, "EEEE, MMMM d")}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                aria-label="Previous period"
                variant="outline"
                size="icon"
                onClick={() => setOffset(offset - (week ? 7 : 1))}
              >
                <ArrowLeft />
              </Button>
              <Button
                aria-label="Next period"
                variant="outline"
                size="icon"
                onClick={() => setOffset(offset + (week ? 7 : 1))}
              >
                <ArrowRight />
              </Button>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-secondary p-5 text-sm">
            <Moon size={20} />
            <p>Five quiet minutes tonight. A clearer day tomorrow.</p>
          </div>
          <div className="mt-8 overflow-x-auto">
            <div
              className={`grid ${week ? "min-w-[760px] grid-cols-7" : "grid-cols-1"}`}
            >
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="border-r last:border-r-0"
                >
                  {week && (
                    <h2 className="mb-5 text-center text-sm font-medium">
                      {format(day, "EEE d")}
                    </h2>
                  )}
                  {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => (
                    <div
                      key={hour}
                      className="flex h-20 gap-4 border-t border-border/60"
                    >
                      <span className="w-12 pt-2 text-xs text-muted-foreground">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Foundation preview · {timezone} · Scheduling interactions are not
            connected yet.
          </p>
        </section>
      </div>
    </main>
  );
}
